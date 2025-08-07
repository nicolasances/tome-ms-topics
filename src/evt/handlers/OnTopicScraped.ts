import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { ControllerConfig } from "../../Config";
import { TopicsStore } from "../../store/TopicsStore";
import { ValidationError } from "toto-api-controller/dist/validation/Validator";
import { TotoRuntimeError } from "toto-api-controller/dist/model/TotoRuntimeError";

/**
 * When a topic has been scraped, this handler will update the topic with the number of sections in it and in general all information provided in the "topicScraped" event.
 * This is used to keep the topic information up-to-date in the system.
 */
export class OnTopicScraped {

    execContext: ExecutionContext;
    config: ControllerConfig;

    constructor(execContext: ExecutionContext) {
        this.execContext = execContext;
        this.config = execContext.config as ControllerConfig;
    }

    async do(data: OnTopicScrapedMsgPayload) {

        const logger = this.execContext.logger;
        const cid = this.execContext.cid;

        let client;

        try {

            client = await this.config.getMongoClient();
            const db = client.db(this.config.getDBName());

            // Update the topic, recording the last practice date
            const result = await new TopicsStore(db, this.config).updateTopicMetadata(data.topicId, {numSections: data.numSections});

            logger.compute(cid, `Topic ${data.topicId} updated with number of sections [${data.numSections}]. Modified count: ${result}`)

            return { processed: true }

        } catch (error) {

            logger.compute(cid, `${error}`, "error")

            if (error instanceof ValidationError || error instanceof TotoRuntimeError) {
                throw error;
            }
            else {
                console.log(error);
                throw error;
            }

        }
        finally {
            if (client) client.close();
        }


    }

}

interface OnTopicScrapedMsgPayload {
    topicId: string;
    topicCode: string;
    numSections: number;
    user: string;
}
