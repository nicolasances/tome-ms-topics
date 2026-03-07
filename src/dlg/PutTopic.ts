import { Request } from "express";
import { ControllerConfig } from "../Config";
import { TopicMetadata, TopicsStore } from "../store/TopicsStore";
import { Logger, TotoDelegate, TotoRuntimeError, UserContext, ValidationError } from "totoms";


export class PutTopic extends TotoDelegate<PutTopicRequest, PutTopicResponse> {

    async do(req: PutTopicRequest, userContext: UserContext): Promise<PutTopicResponse> {

        const logger = Logger.getInstance();
        const config = this.config as ControllerConfig;

        const topicId = req.topicId;

        const topicMetadata = TopicMetadata.fromHTTPBody(req);

        try {

            const db = await config.getMongoDb(config.getDBName());

            const topicStore = new TopicsStore(db, config);

            const result = await topicStore.updateTopicMetadata(topicId, topicMetadata);

            // Return something
            return { result: result }

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
    
    public parseRequest(req: Request): PutTopicRequest {
        return {
            topicId: req.params.topicId,
            ...req.body
        };
    }

}

interface PutTopicRequest extends TopicMetadata {
    topicId: string;
}

interface PutTopicResponse {
    result: number
}