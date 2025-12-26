import { ControllerConfig } from "../../Config";
import { TopicsStore } from "../../store/TopicsStore";
import { TrackingStore } from "../../store/TrackingStore";
import { ExecutionContext, newTotoServiceToken, TotoMessage, TotoRuntimeError, ValidationError } from "../../totoapicontroller";

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

    async do(msg: TotoMessage) {

        const logger = this.execContext.logger;
        const cid = msg.cid;
        const data = msg.data as OnTopicScrapedMsgPayload;

        try {

            const db = await this.config.getMongoDb(this.config.getDBName());

            // Update the topic, recording the last practice date
            const result = await new TopicsStore(db, this.config).updateTopicMetadata(data.topicId, { numSections: data.numSections });

            // Delete all refresh tracking records for the topic
            const deletedCount = await new TrackingStore(db, this.config).deleteAllRecords(data.topicId);

            logger.compute(cid, `Topic ${data.topicId} updated with number of sections [${data.numSections}]. Modified count: ${result}. Deleted tracking records: ${deletedCount}`)

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

    }

}

interface OnTopicScrapedMsgPayload {
    topicId: string;
    topicCode: string;
    numSections: number;
    user: string;
}
