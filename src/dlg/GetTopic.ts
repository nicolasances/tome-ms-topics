import { Request } from "express";
import { ControllerConfig } from "../Config";
import { TopicsStore } from "../store/TopicsStore";
import { Logger, ToolResponse, TotoDelegate, TotoMCPDelegate, TotoMCPToolDefinition, TotoRuntimeError, UserContext, ValidationError } from "../totoms";
import z from "zod";

export class GetTopic extends TotoMCPDelegate {

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
    public async processToolRequest(input: any, userContext: UserContext): Promise<ToolResponse> {

        const logger = Logger.getInstance();
        const config = this.config as ControllerConfig;

        const topicId = input.topicId;

        // Extract user
        const user = userContext.email;

        try {

            // Instantiate the DB
            const db = await config.getMongoDb(config.getDBName());

            const topicStore = new TopicsStore(db, config);

            const topic = await topicStore.findTopicById(topicId);

            return {
                content: [
                    {
                        type: "text",
                        text: `Here are the details of the topic with ID ${topicId}:\n${JSON.stringify(topic, null, 2)}`
                    }
                ]
            }

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

        const topicId = req.params.topicId;

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

}