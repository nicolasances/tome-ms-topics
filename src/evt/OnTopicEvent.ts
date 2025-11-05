import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { OnPracticeFinished } from "./handlers/OnPracticeFinished";
import { OnFlashcardsCreated } from "./handlers/OnFlashcardsCreated";
import { OnTopicScraped } from "./handlers/OnTopicScraped";
import { ITotoPubSubEventHandler } from "../apicontroller/evt/TotoPubSubEventHandler";
import { TotoMessage } from "../apicontroller/evt/TotoMessage";

/**
 * Reacts to events on topics
 */
export class OnTopicEvent implements ITotoPubSubEventHandler {

    async onEvent(msg: TotoMessage, execContext: ExecutionContext): Promise<any> {

        const logger = execContext.logger;
        const cid = execContext.cid;

        logger.compute(cid, `Received event ${JSON.stringify(msg)}`)

        // if (msg.type == EVENTS.flashcardsCreated) return await new OnFlashcardsCreated(execContext).do(req);
        if (msg.type == EVENTS.topicScraped) return await new OnTopicScraped(execContext).do(msg.data);

        logger.compute(cid, `Event ${msg.type} is not handled by this service. Ignoring.`);

        return { consumed: false };

    }

}


export const EVENTS = {

    // Flashcards have been created
    flashcardsCreated: "flashcardsCreated",

    // Topic has been scraped
    topicScraped: "topicScraped",

}