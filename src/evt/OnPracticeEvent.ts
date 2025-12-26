import { OnPracticeFinished } from "./handlers/OnPracticeFinished";
import { ExecutionContext, ITotoPubSubEventHandler, TotoMessage } from "../totoapicontroller";

/**
 * Reacts to events on topics
 */
export class OnPracticeEvent implements ITotoPubSubEventHandler {

    async onEvent(msg: TotoMessage, execContext: ExecutionContext): Promise<any> {

        const logger = execContext.logger;
        const cid = execContext.cid;

        logger.compute(cid, `Received event ${JSON.stringify(msg)}`)

        if (msg.type == EVENTS.practiceFinished) return await new OnPracticeFinished(execContext).do(msg);

        logger.compute(cid, `Event ${msg.type} is not handled by this service. Ignoring.`);

        return { consumed: false };

    }

}


export const EVENTS = {

    // A practice has been finished
    practiceFinished: "practiceFinished",

}