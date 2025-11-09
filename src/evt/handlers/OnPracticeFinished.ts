import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { TotoRuntimeError } from "toto-api-controller/dist/model/TotoRuntimeError";
import { ControllerConfig } from "../../Config";
import { ValidationError } from "toto-api-controller/dist/validation/Validator";
import { Practice } from "../../model/Practice";
import { TopicsStore } from "../../store/TopicsStore";
import { TotoMessage } from "toto-api-controller";

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

        let client;

        try {

            client = await this.config.getMongoClient();
            const db = client.db(this.config.getDBName());

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
        finally {
            if (client) client.close();
        }


        return { consumed: true }

    }
}