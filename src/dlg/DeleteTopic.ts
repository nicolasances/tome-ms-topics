import { Request } from "express";
import { ControllerConfig } from "../Config";
import { Logger, TotoDelegate, TotoRuntimeError, UserContext, ValidationError } from "totoms";
import { TopicsStore } from "../store/TopicsStore";
import { EVENTS } from "../evt/Events";


export class DeleteTopic extends TotoDelegate<DeleteTopicRequest, DeleteTopicResponse> {

    async do(req: DeleteTopicRequest, userContext: UserContext): Promise<DeleteTopicResponse> {

        const logger = Logger.getInstance();
        const config = this.config as ControllerConfig;


        // Extract user
        const user = userContext.email;

        try {

            // Instantiate the DB
            const db = await config.getMongoDb(config.getDBName());

            const topicStore = new TopicsStore(db, config);

            // Read the topic
            const topic = await topicStore.findTopicById(req.topicId);

            if (!topic) throw new ValidationError(404, `Topic with id ${req.topicId} not found for user ${user}`);

            const deletedCount = await topicStore.deleteTopicById(req.topicId, user)

            // Publish the event
            if (deletedCount > 0) await this.messageBus.publishMessage({ topic: "tometopics" }, {
                cid: this.cid!,
                id: req.topicId,
                type: EVENTS.topicDeleted,
                msg: `Topic ${req.topicId} deleted by user ${user}`,
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
    public parseRequest(req: Request): DeleteTopicRequest {
        return {
            topicId: req.params.id
        }
    }

}

interface DeleteTopicRequest {
    topicId: string;
}

interface DeleteTopicResponse {
    deletedCount: number;
}