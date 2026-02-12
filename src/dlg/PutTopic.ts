import { Request } from "express";
import { ControllerConfig } from "../Config";
import { TopicMetadata, TopicsStore } from "../store/TopicsStore";
import { Logger, TotoDelegate, TotoRuntimeError, UserContext, ValidationError } from "../totoms";


export class PutTopic extends TotoDelegate<any, PutTopicResponse> {

    async do(req: any, userContext: UserContext): Promise<PutTopicResponse> {

        const logger = Logger.getInstance();
        const config = this.config as ControllerConfig;

        const topicId = req.params.topicId;

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
    
    public parseRequest(req: Request) {
        return req.body;
    }

}

interface PutTopicResponse {
    result: number
}