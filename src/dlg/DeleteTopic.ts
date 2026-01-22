import { Request } from "express";
import { ControllerConfig } from "../Config";
import { Logger, TotoDelegate, TotoRuntimeError, UserContext, ValidationError } from "totoms";
import { TopicsStore } from "../store/TopicsStore";
import { EVENTS } from "../evt/Events";


export class DeleteTopic extends TotoDelegate {

    async do(req: Request, userContext: UserContext): Promise<any> {

        const logger = Logger.getInstance();
        const config = this.config as ControllerConfig;


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
            if (deletedCount > 0) await this.messageBus.publishMessage({ topic: "tometopics" }, {
                cid: this.cid!,
                id: req.params.id,
                type: EVENTS.topicDeleted,
                msg: `Topic ${req.params.id} deleted by user ${user}`,
                timestamp: new Date().toISOString(),
                data: topic
            })

            return { deletedCount: deletedCount }


        } catch (error) {

            logger.compute(this.cid, `${error}`, "error")

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