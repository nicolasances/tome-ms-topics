import { Request } from "express";
import { TotoMessage } from "./TotoMessage";
import { ExecutionContext, Logger, TotoAPIController, TotoControllerConfig, TotoRuntimeError } from "..";
import { v4 as uuidv4 } from 'uuid';

export interface TotoMessageBusConfiguration {
    controller: TotoAPIController;
    messageBusImplementations: {
        aws?: IMessageBus;
        gcp?: IMessageBus;
        azure?: IMessageBus;
    }
}

/**
 * Options for registering a message handler.
 * 
 * - pushOptions are needed for Pub/Sub PUSH implementations, where the message bus infrastructure pushes messages to an HTTP endpoint exposed by the application.
 *  - endpointPath is the path (relative to the base path of the API Controller) where the message bus will push messages to.
 */
export interface MessageHandlerRegistrationOptions {
    enablePushSupport?: boolean;
}

/**
 * This is the main class to be used by Message (Event) Producers and Consumers. 
 * 
 * It provides the capabilities to: 
 * - Publish messages to a message bus (as a producer), whether it is a pub/sub or queue-based message bus.
 * - Register message handlers to process incoming messages (as a consumer).
 * 
 * It relies on underlying implementations of IMessageBus, which can be either IPubSub or IQueue.
 * 
 * Important design choices: 
 * - The MessageBus registers its own handler for incoming messages from both PULL queues and PUSH Pub/Subs.
 * - The MessageBus ALWAYS registers itself with the API Controller on a /events endpoint to receive incoming PUSH messages from Pub/Sub implementations. 
 *      This happens independently of whether there are any registered handlers or not and whether PUSH support is enabled or not. 
 *      That gives generally more flexibility, so no extra configuration is needed for PUSH support.
 */
export class TotoMessageBus {

    protected messageHandlerRegistrations: MessageHandlerRegistration[] = [];

    private apiController: TotoAPIController;
    private hyperscaler: "aws" | "gcp" | "azure";
    private registeredBusImplementations: Map<"aws" | "gcp" | "azure", IMessageBus> = new Map();

    constructor(config: TotoMessageBusConfiguration) {

        // Register the provided bus implementations
        if (config.messageBusImplementations.aws) this.registeredBusImplementations.set("aws", config.messageBusImplementations.aws);
        if (config.messageBusImplementations.gcp) this.registeredBusImplementations.set("gcp", config.messageBusImplementations.gcp);
        if (config.messageBusImplementations.azure) this.registeredBusImplementations.set("azure", config.messageBusImplementations.azure);

        // Store the API Controller reference
        this.apiController = config.controller;

        this.hyperscaler = config.controller.config.hyperscaler == 'local' ? config.controller.config.options?.defaultHyperscaler ?? 'gcp' : config.controller.config.hyperscaler;

        // IMPORTANT! Register the message bus's handler (filter) in API Controller and Pull Queues and PubSubs
        // 1. For PULL queue implementations, register the MessageBus PULL callback so that messages pulled by the queue are routed to the MessageBus first
        this.registeredBusImplementations.forEach((busImpl, hyperscaler) => {
            if (busImpl instanceof IQueue) {
                (busImpl as IQueue).setMessageHandler(this.onPullMessageReceived.bind(this));
            }
        });
        // 2. For PUSH Pub/Sub implementations, register the MessageBus PUSH callback in the API Controller so that all messages received on the endpoint are routed to the MessageBus
        this.apiController.registerPubSubMessageEndpoint("/events", this.onPushMessageReceived.bind(this));
    }

    /**
     * Registers a message handler to process incoming messages.
     * 
     * @param handler the handler to register
     */
    public registerMessageHandler(handler: TotoMessageHandler, options?: MessageHandlerRegistrationOptions): void {

        // Register the handler
        this.messageHandlerRegistrations.push(new MessageHandlerRegistration({
            messageHandler: handler,
            messageType: handler.getHandledMessageType(),
        }));

    }

    /**
     * Returns the message bus implementation for the given hyperscaler.
     * 
     * @param hyperscaler the hyperscaler where this code is running (hosted)
     * 
     * @returns the right bus for the hyperscaler
     */
    private getBus(): IMessageBus {

        const bus = this.registeredBusImplementations.get(this.hyperscaler);

        if (!bus) {
            throw new TotoRuntimeError(500, `No message bus registered for hyperscaler ${this.hyperscaler}`);
        }

        return bus;
    }

    /**
     * Publishes a message to the message bus.
     * 
     * @param destination the message destination
     * @param message the message itself
     * @returns 
     */
    public publishMessage(destination: MessageDestination, message: TotoMessage): Promise<void> {
        return this.getBus().publishMessage(destination, message);
    }

    /**
     * Callback for all PULL queue implementations when a message is received from the queue.
     * This intercepts ALL incoming messages from PULL queues and routes them to the right handler.
     * 
     * @param envelope 
     */
    public async onPullMessageReceived(envelope: any): Promise<ProcessingResponse> {

        const messageBus = this.getBus();

        if (!messageBus) return { status: "ignored", responsePayload: "No message bus implementation found" };
        if (!(messageBus instanceof IQueue)) return { status: "ignored", responsePayload: "Message bus is not a Queue implementation" };

        // Decode the message
        const message: TotoMessage = messageBus.convert(envelope);

        // Get the handler
        const handler = this.findHandler("pull", message.type);

        if (!handler) return { status: "ignored", responsePayload: `No handler found for message type ${message.type}` };

        // Call the handler
        return handler.onMessage(message, new ExecutionContext(this.apiController.logger, this.apiController.apiName, this.apiController.config, uuidv4()));
    }

    /**
     * Push endpoint for Pub/Sub implementations that support PUSH mechanisms.
     * This intercepts ALL incoming Pub/Sub PUSH requests and routes them to the right handler.
     * It is used by the API Controller when registering the endpoint for Pub/Sub PUSH messages: the API Controller calls this method when a request is received on the registered endpoint.
     * 
     * @param req 
     */
    public async onPushMessageReceived(req: Request, execContext: ExecutionContext): Promise<ProcessingResponse> {

        const messageBus = this.getBus();

        if (!messageBus) return { status: "ignored", responsePayload: "No message bus implementation found" };

        const isAuthorized = await messageBus.getRequestValidator().isRequestAuthorized(req);

        if (!isAuthorized) throw new TotoRuntimeError(401, "Unauthorized PubSub request: " + JSON.stringify(req));

        // For PubSub implementations, check if there's a filter to handle this request
        // If the message is not destined to the handler (e.g. message that needs to be intercepted by a filter), then let the filter handle it
        if (messageBus instanceof IPubSub) {
            const filter = (messageBus as IPubSub).filter(req);

            if (filter) return await filter.handle(req);
        }

        // Decode the message
        const message: TotoMessage = messageBus.convert(req);

        // Get the handler
        const handler = this.findHandler("push", message.type);

        if (!handler) return { status: "ignored", responsePayload: `No handler found for message type ${message.type}` };

        // Call the handler
        return handler.onMessage(message, execContext);
    }

    /**
     * Finds the registered handler for the given message type and bus type.
     * 
     * @param type the type of message bus (push or pull)
     * @param messageType the message type (the TotoMessage.type)
     * @returns the handler if found, null otherwise
     */
    private findHandler(type: "push" | "pull", messageType: string): TotoMessageHandler | null {

        const registration = this.messageHandlerRegistrations.find(r => r.messageType === messageType);

        return registration ? registration.messageHandler : null;
    }

}

/**
 * Utility class to track message handler registrations.
 */
class MessageHandlerRegistration {

    messageType: string;
    messageHandler: TotoMessageHandler;

    constructor(data: MessageHandlerRegistration) {
        this.messageHandler = data.messageHandler;
        this.messageType = data.messageType;
    }
}

/**
 * Interface for Message Bus implementations (e.g., Pub/Sub, SQS, RabbitMQ). 
 * Use this interface for publish-subscribe style message buses (e.g., Pub/Sub).
 * 
 * This abstract class is not exported as it SHOULD NOT be implemented directly. Instead, use the specialized interfaces IPubSub or IQueue.
 */
abstract class IMessageBus {

    /**
     * Publishes a message to the specified topic or queue.
     * 
     * @param destination the destination (topic or queue) where the message should be published
     * @param message the TotoMessage to be published
     */
    abstract publishMessage(destination: MessageDestination, message: TotoMessage): Promise<void>;

    /**
     * Decodes the payload of a message received from the message bus and transforms it into a TotoMessage.
     * 
     * @param envelope the envelope of the message received from the message bus. 
     * The structure of the envelope depends on the specific message bus implementation.
     * For example: 
     *  - In GCP PubSub Push, then envelope will be the HTTP Request object received from PubSub.
     *  - In AWS SQS, then envelope will be the message object received from SQS (Message object from AWS SDK).
     *  - In AWS SNS Push, then envelope will be the HTTP Request object received from SNS. 
     */
    abstract convert(envelope: any): TotoMessage;

    /**
     * Gets the Request Validator for this implementation. 
     * The Request Validator is used to validate incoming requests from the messaging infrastructure. It checks: 
     * - if the request is recognized by the validator (i.e., if it comes from the expected messaging infrastructure and is well-formed)
     * - if the request is authorized (i.e., if it has the correct authentication/authorization to be processed)
     */
    abstract getRequestValidator(): APubSubRequestValidator;

}

/**
 * Implementation of IMessageBus for publish-subscribe style message buses (e.g., GCP PubSub, AWS SNS).
 */
export abstract class IPubSub extends IMessageBus {

    /**
     * Allows the pubSub implementation to filter incoming requests that should not be processed by the main event handler.
     * 
     * For example, in AWS SNS, subscription confirmation requests need to be handled separately from the main event processing and should not clutter application code.
     * 
     * @param req the HTTP Request from the pubsub infrastructure
     */
    abstract filter(req: Request): APubSubRequestFilter | null;
}

/**
 * Interface for Queue-like Message Buses (e.g., SQS, RabbitMQ)
 */
export abstract class IQueue extends IMessageBus {

    protected messageHandler: (msgPayload: any) => Promise<ProcessingResponse> = (msgPayload: any) => { throw new Error("Message handler not set"); };

    /**
     * Used for cleanup during application shutdown.
     * Implementations should close any open connections and release resources here, if needed and applicable.
     */
    abstract close(): Promise<void>;

    /**
     * Sets the message handler for the messages received from the queue. 
     * The message handler should always be a MessageBus instance, so that messages received from the queue are first routed to the MessageBus 
     * before being dispatched to the right handler.
     * 
     * This SHOULD NOT be overridden by subclasses.
     * 
     * @param handler the handler for the messages received from the queue
     */
    public setMessageHandler(handler: (msgPayload: any) => Promise<ProcessingResponse>): void {
        this.messageHandler = handler;
    }

}

/**
 * Interface for handling incoming Toto Messages.
 * All Handlers must implement this interface.
 */
export abstract class TotoMessageHandler {

    /**
     * The type of event handled by this handler.
     * 
     * By design, each handler handles a single event type.
     */
    protected abstract handledMessageType: string;

    /**
     * Gets the type of event handled by this handler.
     */
    getHandledMessageType(): string {
        return this.handledMessageType;
    }

    /**
     * Processes an incoming message.
     * 
     * @param msg the message to process
     * @param execContext the execution context for the message
     */
    abstract onMessage(msg: TotoMessage, execContext: ExecutionContext): Promise<ProcessingResponse>;

}

export interface ProcessingResponse {
    status: "processed" | "ignored" | "failed";
    responsePayload?: any;
}

export interface APubSubRequestFilter {
    handle(req: Request): Promise<ProcessingResponse>;
}

/**
 * Represents a destination for messages, either a topic (for Pub/Sub) or a queue (for queue-based message buses).
 */
export class MessageDestination {
    topic?: string;
    queue?: string;

    constructor(init: { topic: string; queue?: string } | { topic?: string; queue: string }) {
        Object.assign(this, init);
    }
}

/**
 * Class responsible for validating incoming requests from Messaging infrastructures.
 */
export abstract class APubSubRequestValidator {

    /**
     * Checks if the request is authorized.
     * 
     * @param req the HTTP request
     */
    abstract isRequestAuthorized(req: Request): Promise<boolean>;

    /**
     * Checks if the request is recognized by the validator. 
     * The concrete implementation of the validator will define if the request comes from the expected PubSub infrastructure that is handled by the validator.
     * 
     * @param req the HTTP request
     */
    abstract isRequestRecognized(req: Request): boolean;

}
