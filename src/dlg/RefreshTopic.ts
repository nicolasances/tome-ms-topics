import { Request } from "express";
import { ControllerConfig } from "../Config";
import { TopicsStore } from "../store/TopicsStore";
import { ExecutionContext, TotoDelegate, TotoRuntimeError, UserContext, ValidationError } from "../totoapicontroller";
import { EVENTS } from "../evt/Events";


export class RefreshTopic extends TotoDelegate {

    async do(req: Request, userContext: UserContext, execContext: ExecutionContext): Promise<any> {

        const body = req.body
        const logger = execContext.logger;
        const cid = execContext.cid;
        const config = execContext.config as any as ControllerConfig;

        const topicId = req.params.topicId;

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
            this.messageBus.publishMessage({topic: "tometopics"}, {
                cid: cid!,
                id: topicId,
                type: EVENTS.topicRefreshed, 
                msg: `Topic ${topicId} refreshed by user ${user}`,
                timestamp: new Date().toISOString(),
                data: preexistingTopic
            })

            // Return something
            return { refreshed: true }


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