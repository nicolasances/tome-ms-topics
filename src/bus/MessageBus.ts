import { TotoControllerConfig } from "toto-api-controller";


/**
 * This module provides asynchronous messaging capabilities. 
 * It represents an INTERFACE to a message broker (e.g. GCP Pub/Sub, AWS SQS, RabbitMQ, etc.)
 * 
 * It is compatible with different message brokers via adapters.
 */
export class TotoMessageBus {

    private messageBus: IMessageBus;
    private messageHandlers: TotoMessageHandler[] = [];

    constructor(factory: MessageBusFactory, config: TotoControllerConfig) {

        this.messageBus = factory.createMessageBus(config);

        if (this.messageBus instanceof IQueue) {

            // If the message bus is a queue, set up a message handler
            (this.messageBus as IQueue).setMessageHandler(this.handleMessage.bind(this));
        }
    }

    /**
     * Registers a message handler to be invoked upon message arrival (if the message type is handled by the handler).
     * @param handler the handler to be registered.
     */
    registerMessageHandler(handler: TotoMessageHandler): void {
        this.messageHandlers.push(handler);
    }

    /**
     * Decodes a message received from the message bus, based on the underlying implementation.
     * 
     * @param msgPayload the payload received from the message bus
     */
    decodeMessage(msgPayload: any): TotoMessage {

        try {

            return this.messageBus.decodeMessage(msgPayload);

        } catch (error) {

            // If there's a decoding error log and throw
            console.log(`Error decoding message ${JSON.stringify(msgPayload)}: ${error}`);
            throw error;

        }

    }

    /**
     * Publishes a task to the message bus for asynchronous processing.
     * @param task the task to publish
     * @param cid a correlation id for tracking
     */
    async publishMessage(topicOrQueue: string, messageType: string, payload: any, cid: string): Promise<void> {

        const msg = new TotoMessage(messageType, cid, payload);

        // Call the underlying message bus implementation
        return this.messageBus.publishMessage(topicOrQueue, msg);
    }

    /**
     * Handles the incoming message from the message bus. 
     * This is used for queue-like message buses (e.g., SQS, RabbitMQ).
     * 
     * @param msgPayload the payload of the message
     */
    async handleMessage(msgPayload: any): Promise<void> {

        // 1. Decode the Toto Message
        const totoMessage: TotoMessage = this.decodeMessage(msgPayload);

        // 2. Call all the registered handlers that can handle this message type. Runs all in parallel. Completes when all are done.
        const handlers = this.messageHandlers.filter(h => h.handledMessageTypes().includes(totoMessage.type));

        await Promise.all(handlers.map(h => h.onMessage(totoMessage)));

    }
}

/**
 * Factory for creating Message Bus instances based on the hyperscaler.
 */
export abstract class MessageBusFactory {

    abstract createMessageBus(config: TotoControllerConfig): IMessageBus;
}

/**
 * Interface for Message Bus implementations (e.g., Pub/Sub, SQS, RabbitMQ). 
 * Use this interface for publish-subscribe style message buses (e.g., Pub/Sub).
 */
export abstract class IMessageBus {

    abstract publishMessage(topicOrQueue: string, msgPayload: any): Promise<void>;
    abstract decodeMessage(msgPayload: any): TotoMessage;

}

/**
 * Interface for Queue-like Message Buses (e.g., SQS, RabbitMQ)
 */
export abstract class IQueue extends IMessageBus {

    abstract setMessageHandler(handler: (msg: TotoMessage) => Promise<void>): void;

    /**
     * Used for cleanup during application shutdown.
     */
    abstract close(): Promise<void>;

}

/**
 * Interface for handling incoming Toto Messages.
 * All Handlers must implement this interface.
 * Handlers need to be registered with the TotoMessageBus to be invoked upon message arrival.
 */
export interface TotoMessageHandler {

    /**
     * Types of message handled by this handler.
     */
    handledMessageTypes(): string[];

    /**
     * Processes an incoming message, that is guaranteed to be of a type handled by this handler.
     * 
     * @param msg the message to be processed
     */
    onMessage(msg: TotoMessage): Promise<void>;
}

/**
 * Represents a message to be sent via the Message Bus.
 */
export class TotoMessage {

    type: string;               // The type of message (event)
    cid: string;                // A Correlation Id
    timestamp: number;          // A timestamp in milliseconds
    payload: any;               // The message payload

    constructor(type: string, cid: string, payload: any) {
        this.type = type;
        this.cid = cid;
        this.timestamp = Date.now();
        this.payload = payload;
    }

    /**
     * Validates the message structure, to make sure that it is compliant with the interface of Gale Message.
     * @param message the message to validate
     */
    static validate(message: any): boolean {

        if (!message) {
            return false;
        }

        const { type, cid, timestamp, payload } = message;

        if (typeof type !== "string") return false;
        if (typeof cid !== "string") return false;
        if (typeof timestamp !== "number") return false;
        if (typeof payload !== "object") return false;

        return true;
    }
}
