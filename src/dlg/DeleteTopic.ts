import { Request } from "express";
import { ControllerConfig } from "../Config";
import { EventPublisher, EVENTS } from "../evt/EventPublisher";
import { ExecutionContext, TotoDelegate, TotoRuntimeError, UserContext, ValidationError } from "../totoapicontroller/TotoAPIController";
import { TopicsStore } from "../store/TopicsStore";


export class DeleteTopic implements TotoDelegate {

    async do(req: Request, userContext: UserContext, execContext: ExecutionContext): Promise<any> {

        const logger = execContext.logger;
        const cid = execContext.cid;
        const config = execContext.config as ControllerConfig;


        // Extract user
        const user = userContext.email;

        try {

            // Instantiate the DB
            const db = await config.getMongoDb(config.getDBName());

            const topicStore = new TopicsStore(db, config); 

            // Read the topic
            const topic = await topicStore.findTopicById(req.params.id);

            if (!topic) throw new ValidationError(404, `Topic with id ${req.params.id} not found for user ${user}`);

            const deletedCount = await topicStore.deleteTopicById(req.params.id, user)

            // Publish the event
            if (deletedCount > 0) await new EventPublisher(execContext, "tometopics").publishEvent(req.params.id, EVENTS.topicDeleted, `Topic with id ${req.params.id} deleted by user ${user}`, topic);

            return {deletedCount: deletedCount}


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