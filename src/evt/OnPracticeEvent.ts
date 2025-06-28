import { Request } from "express";
import { TotoDelegate } from "toto-api-controller/dist/model/TotoDelegate";
import { UserContext } from "toto-api-controller/dist/model/UserContext";
import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { OnPracticeFinished } from "./handlers/OnPracticeFinished";

/**
 * Reacts to events on topics
 */
export class OnPracticeEvent implements TotoDelegate {

    async do(req: Request, userContext: UserContext, execContext: ExecutionContext): Promise<any> {

        const logger = execContext.logger;
        const cid = execContext.cid;

        let msg = JSON.parse(String(Buffer.from(req.body.message.data, 'base64')))

        logger.compute(cid, `Received event ${JSON.stringify(msg)}`)

        if (msg.type == EVENTS.practiceFinished) return new OnPracticeFinished(execContext).do(req);

        logger.compute(cid, `Event ${msg.type} is not handled by this service. Ignoring.`);

        return { consumed: false };

    }

}


export const EVENTS = {

    // A practice has been finished
    practiceFinished: "practiceFinished",

}