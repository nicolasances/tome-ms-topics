import { Request } from "express";
import { UserContext } from "./UserContext";
import { TotoMessageBus } from "../evt/MessageBus";
import { TotoControllerConfig } from "./TotoControllerConfig";

export abstract class TotoDelegate {

    protected cid?: string = undefined;

    constructor(protected messageBus: TotoMessageBus, protected config: TotoControllerConfig) { }

    /**
     * Processes the incoming request and returns a Promise with the result. 
     * 
     * This method wraps the abstract do() method to provide common pre- and post-processing logic if needed.
     * 
     * @param req the HTTP request
     * @param userContext the User Context, if available
     */
    public async processRequest(req: Request | FakeRequest, userContext?: UserContext): Promise<any> {

        // Extract CID
        this.cid = req.headers['x-correlation-id'] || req.headers['X-Correlation-Id'];
    }

    protected abstract do(req: Request | FakeRequest, userContext?: UserContext): Promise<any>

}

export interface FakeRequest {

    query: any,
    params: any,
    headers: any,
    body: any

}