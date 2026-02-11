import { Request } from "express";
import { ControllerConfig } from "../Config";
import { TopicsStore } from "../store/TopicsStore";
import { Logger, TotoDelegate, TotoRuntimeError, UserContext, ValidationError } from "../totoms";
import { TotoMCPDelegate } from "../totoms/mcp/TotoMCPDelegate";
import { ToolResponse } from "../totoms/mcp/ToolResponse";
import { TotoMCPToolDefinition } from "../totoms/mcp/TotoMCPToolDefinition";


export class GetTopics extends TotoMCPDelegate {

    public getToolDefinition(): TotoMCPToolDefinition {
        throw new Error("Method not implemented.");
    }
    
    public async processToolRequest(input: any): Promise<ToolResponse> {

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
            return {topics: topics};


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
            return {topics: topics};


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