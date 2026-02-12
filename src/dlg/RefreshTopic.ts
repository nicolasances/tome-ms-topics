import { Request } from "express";
import { ControllerConfig } from "../Config";
import { TopicsStore } from "../store/TopicsStore";
import { Logger, TotoDelegate, TotoRuntimeError, UserContext, ValidationError } from "../totoms";
import { EVENTS } from "../evt/Events";


export class RefreshTopic extends TotoDelegate<RefreshTopicRequest, RefreshTopicResponse> {

    async do(req: RefreshTopicRequest, userContext: UserContext): Promise<RefreshTopicResponse> {

        const logger = Logger.getInstance();
        const config = this.config as ControllerConfig;

        const topicId = req.topicId;

        // Extract user
        const user = userContext.email;

        try {

            const db = await config.getMongoDb(config.getDBName());

            const topicStore = new TopicsStore(db, config);

            // Check that the topic does not already exist
            const preexistingTopic = await topicStore.findTopicById(topicId);

            if (!preexistingTopic) throw new ValidationError(400, `Topic with id ${topicId} could not be found.`);

            // Update the topic, making sure that flashcards generation is NOT marked as complete
            await topicStore.updateTopicMetadata(topicId, { flashcardsGenerationComplete: false });

            // Publish the event
            await this.messageBus.publishMessage({ topic: "tometopics" }, {
                cid: this.cid!,
                id: topicId,
                type: EVENTS.topicRefreshed,
                msg: `Topic ${topicId} refreshed by user ${user}`,
                timestamp: new Date().toISOString(),
                data: preexistingTopic
            })

            // Return something
            return { refreshed: true }


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

    public parseRequest(req: Request): RefreshTopicRequest {
        return {
            topicId: req.params.topicId
        }
    }

}

interface RefreshTopicRequest {
    topicId: string;
}

interface RefreshTopicResponse {
    refreshed: boolean;
}