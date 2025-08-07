import { Request } from "express";
import { TotoDelegate } from "toto-api-controller/dist/model/TotoDelegate";
import { UserContext } from "toto-api-controller/dist/model/UserContext";
import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { OnPracticeFinished } from "./handlers/OnPracticeFinished";
import { OnFlashcardsCreated } from "./handlers/OnFlashcardsCreated";
import { OnTopicScraped } from "./handlers/OnTopicScraped";

/**
 * Reacts to events on topics
 */
export class OnTopicEvent implements TotoDelegate {

    async do(req: Request, userContext: UserContext, execContext: ExecutionContext): Promise<any> {

        const logger = execContext.logger;
        const cid = execContext.cid;

        let msg = JSON.parse(String(Buffer.from(req.body.message.data, 'base64')))

        logger.compute(cid, `Received event ${JSON.stringify(msg)}`)

        if (msg.type == EVENTS.flashcardsCreated) return await new OnFlashcardsCreated(execContext).do(req);
        else if (msg.type == EVENTS.topicScraped) return await new OnTopicScraped(execContext).do(msg.data);

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