import { Request } from "express";
import { ControllerConfig } from "../Config";
import { TopicsStore } from "../store/TopicsStore";
import { Logger, TotoDelegate, TotoRuntimeError, UserContext, ValidationError } from "../totoms";
import { TotoMCPDelegate } from "../totoms/mcp/TotoMCPDelegate";
import { ToolResponse } from "../totoms/mcp/ToolResponse";
import { TotoMCPToolDefinition } from "../totoms/mcp/TotoMCPToolDefinition";
import z from "zod";
import { Topic } from "../model/Topic";


export class GetTopics extends TotoMCPDelegate<GetTopicsRequest, GetTopicsResponse> {

    public getToolDefinition(): TotoMCPToolDefinition {

        return {
            name: "getTopics",
            title: "Get user's topics in Tome",
            description: "Retrieves all topics associated with the authenticated user that are present in Tome.",
            inputSchema: z.object({}), // No input needed for this tool
        }
    }

    async do(req: GetTopicsRequest, userContext: UserContext): Promise<GetTopicsResponse> {

        const logger = Logger.getInstance();
        const config = this.config as ControllerConfig;

        // Extract user
        const user = userContext.email;

        try {

            const db = await config.getMongoDb(config.getDBName());

            const topicStore = new TopicsStore(db, config);

            // Finds all topics of the user
            const topics = await topicStore.findTopicsByUser(user);

            // Return the topics
            return { topics: topics };


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

    public parseRequest(req: Request): GetTopicsRequest {
        return {}
    }

}

interface GetTopicsRequest {
}

interface GetTopicsResponse {
    topics: Topic[];
}