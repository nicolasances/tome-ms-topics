import { ExecutionContext } from "../TotoAPIController";
import { TotoMessage } from "./TotoMessage";

export interface ITotoPubSubEventHandler {

    onEvent(msg: TotoMessage, execContext: ExecutionContext): Promise<any>;
    
}