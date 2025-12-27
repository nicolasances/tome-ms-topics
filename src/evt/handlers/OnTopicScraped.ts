import { ControllerConfig } from "../../Config";
import { TopicsStore } from "../../store/TopicsStore";
import { TrackingStore } from "../../store/TrackingStore";
import { Logger, TotoMessage, TotoRuntimeError, ValidationError } from "../../totoapicontroller";
import { ProcessingResponse, TotoMessageHandler } from "../../totoapicontroller/evt/MessageBus";

/**
 * When a topic has been scraped, this handler will update the topic with the number of sections in it and in general all information provided in the "topicScraped" event.
 * This is used to keep the topic information up-to-date in the system.
 */
export class OnTopicScraped extends TotoMessageHandler {

    protected handledMessageType: string = 'topicScraped';

    async onMessage(msg: TotoMessage): Promise<ProcessingResponse> {

        const logger = Logger.getInstance();
        const config = this.config as ControllerConfig;
        const cid = msg.cid;
        const data = msg.data as OnTopicScrapedMsgPayload;

        try {

            const db = await config.getMongoDb(config.getDBName());

            // Update the topic, recording the last practice date
            const result = await new TopicsStore(db, config).updateTopicMetadata(data.topicId, { numSections: data.numSections });

            // Delete all refresh tracking records for the topic
            const deletedCount = await new TrackingStore(db, config).deleteAllRecords(data.topicId);

            logger.compute(cid, `Topic ${data.topicId} updated with number of sections [${data.numSections}]. Modified count: ${result}. Deleted tracking records: ${deletedCount}`)

            return { status: 'processed', responsePayload: 'Topic scraped event processed' };

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
