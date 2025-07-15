import { Request } from "express";
import { ControllerConfig } from "../Config";
import { TotoDelegate } from "toto-api-controller/dist/model/TotoDelegate";
import { UserContext } from "toto-api-controller/dist/model/UserContext";
import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { ValidationError } from "toto-api-controller/dist/validation/Validator";
import { TotoRuntimeError } from "toto-api-controller/dist/model/TotoRuntimeError";
import { TopicsStore } from "../store/TopicsStore";
import { EventPublisher, EVENTS } from "../evt/EventPublisher";


export class RefreshTopic implements TotoDelegate {

    async do(req: Request, userContext: UserContext, execContext: ExecutionContext): Promise<any> {

        const body = req.body
        const logger = execContext.logger;
        const cid = execContext.cid;
        const config = execContext.config as ControllerConfig;

        const topicId = req.params.topicId;

        // Extract user
        const user = userContext.email;

        let client;

        try {

            // Instantiate the DB
            client = await config.getMongoClient();
            const db = client.db(config.getDBName());

            const topicStore = new TopicsStore(db, config); 

            // Check that the topic does not already exist
            const preexistingTopic = await topicStore.findTopicById(topicId, user);

            if (!preexistingTopic) throw new ValidationError(400, `Topic with id ${topicId} could not be found.`);

            // Publish the event
            await new EventPublisher(execContext, "tometopics").publishEvent(topicId, EVENTS.topicRefreshed, `Topic ${topicId} refreshed by user ${user}`, preexistingTopic);

            // Return something
            return {refreshed: true}


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