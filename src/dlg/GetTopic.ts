import { Request } from "express";
import { ControllerConfig } from "../Config";
import { TopicsStore } from "../store/TopicsStore";
import { Logger, TotoMCPDelegate, TotoMCPToolDefinition, TotoRuntimeError, UserContext, ValidationError } from "../totoms";
import z from "zod";
import { Topic } from "../model/Topic";

export class GetTopic extends TotoMCPDelegate<GetTopicRequest, Topic | null> {

    public getToolDefinition(): TotoMCPToolDefinition {

        return {
            name: "getTopic",
            title: "Get a specific topic by ID and some of its details",
            description: "Retrieves a specific topic associated with the authenticated user in Tome based on the provided topic ID.",
            inputSchema: z.object({
                topicId: z.string().describe("The unique identifier of the topic to retrieve")
            }),
        }
    }

    async do(req: GetTopicRequest, userContext: UserContext): Promise<Topic | null> {

        const logger = Logger.getInstance();
        const config = this.config as ControllerConfig;

        const topicId = req.topicId;

        // Extract user
        const user = userContext.email;

        try {

            // Instantiate the DB
            const db = await config.getMongoDb(config.getDBName());

            const topicStore = new TopicsStore(db, config);

            return await topicStore.findTopicById(topicId);


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

    public parseRequest(req: Request): GetTopicRequest {

        if (!req.params.topicId) throw new ValidationError(400, "topicId parameter is required");

        return {
            topicId: req.params.topicId
        }
    }

}

interface GetTopicRequest {
    topicId: string;
}
