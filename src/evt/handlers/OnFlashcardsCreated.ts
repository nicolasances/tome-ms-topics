import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { Request } from "express";
import { TotoRuntimeError } from "toto-api-controller/dist/model/TotoRuntimeError";
import { ControllerConfig } from "../../Config";
import { ValidationError } from "toto-api-controller/dist/validation/Validator";
import { Practice } from "../../model/Practice";
import { TopicsStore } from "../../store/TopicsStore";
import { FlashcardsCreatedEvent } from "../model/FlashcardsCreatedEvent";
import { FlashcardsAPI } from "../../api/FlashcardsAPI";

export class OnFlashcardsCreated {

    execContext: ExecutionContext;
    config: ControllerConfig;

    constructor(execContext: ExecutionContext) {
        this.execContext = execContext;
        this.config = execContext.config as ControllerConfig;
    }

    async do(req: Request) {

        let msg = JSON.parse(String(Buffer.from(req.body.message.data, 'base64')))

        const logger = this.execContext.logger;
        const cid = msg.cid;

        const eventPayload = msg.data as FlashcardsCreatedEvent;

        logger.compute(cid, `Flashcards created event: [${JSON.stringify(eventPayload)}]`)
        logger.compute(cid, `Updating topic ${eventPayload.topicId} - ${eventPayload.topicCode}`)

        let client;

        try {

            client = await this.config.getMongoClient();
            const db = client.db(this.config.getDBName());

            // 1. Retrieve the number of flashcards that the topic has so far 
            const {flashcards} = await new FlashcardsAPI(this.execContext, req.headers.authorization as string).getFlashcards(eventPayload.topicId);

            const count = flashcards.length;

            // Update the topic, recording the last practice date
            const result = await new TopicsStore(db, this.config).updateTopicGeneration(eventPayload.topicId, eventPayload.generation, count);
        
            logger.compute(cid, `Topic ${eventPayload.topicId} updated with generation ${eventPayload.generation} and flashcards count ${eventPayload.count}. Modified count: ${result}`)

            return { processed: true }

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
        finally {
            if (client) client.close();
        }

    }
}