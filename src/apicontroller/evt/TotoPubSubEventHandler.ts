import { ExecutionContext } from "../../apicontroller/model/ExecutionContext";
import { TotoMessage } from "./TotoMessage";

export interface ITotoPubSubEventHandler {

    onEvent(msg: TotoMessage, execContext: ExecutionContext): Promise<any>;
    
}