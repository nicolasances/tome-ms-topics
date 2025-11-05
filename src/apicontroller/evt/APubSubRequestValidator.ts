import { Request } from "express";
import { Logger, TotoControllerConfig } from "../TotoAPIController";

export abstract class APubSubRequestValidator {
    
    constructor(protected config: TotoControllerConfig, protected logger: Logger) {}

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
