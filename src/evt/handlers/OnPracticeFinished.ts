import { ControllerConfig } from "../../Config";
import { Practice } from "../../model/Practice";
import { TopicsStore } from "../../store/TopicsStore";
import { ExecutionContext, newTotoServiceToken, TotoMessage, TotoRuntimeError, ValidationError } from "../../totoapicontroller";

export class OnPracticeFinished {

    execContext: ExecutionContext;
    config: ControllerConfig;

    constructor(execContext: ExecutionContext) {
        this.execContext = execContext;
        this.config = execContext.config as ControllerConfig;
    }

    async do(msg: TotoMessage) {

        const logger = this.execContext.logger;
        const cid = msg.cid;

        // This handler expects a Practice in the payload of the event
        const practice = msg.data as Practice;

        logger.compute(cid, `Practice finished: [${JSON.stringify(practice)}]`)
        logger.compute(cid, `Updating topic ${practice.topicId}`)

        try {

            const db = await this.config.getMongoDb(this.config.getDBName());

            // Update the topic, recording the last practice date
            const result = await new TopicsStore(db, this.config).updateTopicLastPractice(practice.topicId, practice);
        
            logger.compute(cid, `Topic ${practice.topicId} updated. Modified count: ${result}`)

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

        return { consumed: true }

    }
}