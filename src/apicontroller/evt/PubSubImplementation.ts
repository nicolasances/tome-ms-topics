import { Request } from "express";
import { Logger, TotoControllerConfig } from "../TotoAPIController";
import { ITotoPubSubEventHandler, TotoMessage } from "./TotoPubSubEventHandler";

export abstract class APubSubImplementation {

    constructor(protected config: TotoControllerConfig, protected logger: Logger) { }

    /**
     * Gets the Request Validator for this PubSub implementation.
     */
    abstract getRequestValidator(): APubSubRequestValidator;

    /**
     * Gets the Event Handler for this PubSub implementation.
     */
    abstract getEventHandler(): ITotoPubSubEventHandler;

    /**
     * Converts the incoming HTTP request from the PubSub infrastructure message format to a TotoMessage.
     * 
     * @param req the HTTP request received from the PubSub infrastructure (e.g. GCP PubSub, AWS SNS...)
     */
    abstract convertMessage(req: Request): TotoMessage; 
}

export abstract class APubSubRequestValidator {

    constructor(protected config: TotoControllerConfig, protected logger: Logger) { }

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
