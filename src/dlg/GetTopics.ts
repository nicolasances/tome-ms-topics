import { Request } from "express";
import { ControllerConfig } from "../Config";
import { TopicsStore } from "../store/TopicsStore";
import { Logger, TotoDelegate, TotoRuntimeError, UserContext, ValidationError } from "../totoms";
import { TotoMCPDelegate } from "../totoms/mcp/TotoMCPDelegate";
import { ToolResponse } from "../totoms/mcp/ToolResponse";
import { TotoMCPToolDefinition } from "../totoms/mcp/TotoMCPToolDefinition";
import z from "zod";


export class GetTopics extends TotoMCPDelegate {

    public getToolDefinition(): TotoMCPToolDefinition {

        return {
            name: "getTopics",
            title: "Get user's topics in Tome",
            description: "Retrieves all topics associated with the authenticated user that are present in Tome.",
            inputSchema: z.object({}), // No input needed for this tool
        }
    }

    public async processToolRequest(input: any, userContext: UserContext): Promise<ToolResponse> {

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
            return {
                content: [
                    {
                        type: "text",
                        text: `Here are your topics in Tome:\n${JSON.stringify(topics, null, 2)}`
                    }
                ]
            };


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

    async do(req: Request, userContext: UserContext): Promise<any> {

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

}