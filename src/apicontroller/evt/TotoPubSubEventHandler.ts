import { Request } from "express";
import { ExecutionContext, TotoDelegate } from "toto-api-controller";
import { UserContext } from "../TotoAPIController";

// export class TotoPubSubEventHandler implements TotoDelegate {

//     constructor(private delegate: ITotoPubSubEventHandler) {}

//     async onHTTPRequest(req: Request): Promise<any> {

//         return this.delegate.do(msg, userContext, execContext);

//     }
// }

export interface TotoMessage {
    data: any;
}

export interface ITotoPubSubEventHandler {

    onEvent(msg: TotoMessage, execContext: ExecutionContext): Promise<any>;
    
}