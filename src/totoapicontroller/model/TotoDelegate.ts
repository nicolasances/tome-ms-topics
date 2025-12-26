import { Request } from "express";
import { ExecutionContext } from "./ExecutionContext";
import { UserContext } from "./UserContext";
import { TotoMessageBus } from "../evt/MessageBus";
import { TotoControllerConfig } from "./TotoControllerConfig";

export abstract class TotoDelegate {

    constructor(protected messageBus: TotoMessageBus, protected config: TotoControllerConfig) {}

    abstract do(req: Request | FakeRequest, userContext: UserContext | undefined, execContext: ExecutionContext): Promise<any>

}

export interface FakeRequest {

    query: any, 
    params: any, 
    headers: any, 
    body: any

}