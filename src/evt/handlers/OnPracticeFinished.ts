import { ControllerConfig } from "../../Config";
import { Practice } from "../../model/Practice";
import { TopicsStore } from "../../store/TopicsStore";
import { Logger, TotoMessage, TotoRuntimeError, ValidationError } from "../../totoapicontroller";
import { ProcessingResponse, TotoMessageHandler } from "../../totoapicontroller/evt/MessageBus";

export class OnPracticeFinished extends TotoMessageHandler {

    protected handledMessageType: string = 'practiceFinished';

    async onMessage(msg: TotoMessage): Promise<ProcessingResponse> {

        const logger = Logger.getInstance();
        const config = this.config as ControllerConfig;
        const cid = msg.cid;

        // This handler expects a Practice in the payload of the event
        const practice = msg.data as Practice;

        logger.compute(cid, `Practice finished: [${JSON.stringify(practice)}]`)
        logger.compute(cid, `Updating topic ${practice.topicId}`)

        try {

            const db = await config.getMongoDb(config.getDBName());

            // Update the topic, recording the last practice date
            const result = await new TopicsStore(db, config).updateTopicLastPractice(practice.topicId, practice);
        
            logger.compute(cid, `Topic ${practice.topicId} updated. Modified count: ${result}`)

            return { status: 'processed', responsePayload: 'Practice finished event processed' };

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