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

            const topicStore = new TopicsStore(db, this.config);

            // 1. Retrieve the number of flashcards that the topic has so far
            const { flashcards } = await new FlashcardsAPI(this.execContext, req.headers.authorization as string).getFlashcards(eventPayload.topicId);

            const count = flashcards.length;

            // 2. Check that if all sections have had flashcards created. We do that by counting the number of sections that have flashcards created and comparing that with the Topic's registered sections.
            // 2.1. Count the number of sections that have flashcards created
            const sections = new Set<string>();
            for (const flashcard of flashcards) {
                sections.add(flashcard.sectionCode);
            }
            const sectionsWithFlashcards = sections.size;

            // 2.2. Get the topic's number of sections
            const topic = await topicStore.findTopicById(eventPayload.topicId);
            const expectedNumSections = topic?.numSections;

            const isFlashcardComplete = sectionsWithFlashcards === expectedNumSections;

            logger.compute(cid, `Topic ${eventPayload.topicId} has ${sectionsWithFlashcards} sections with flashcards, expected ${expectedNumSections}. Flashcard complete: ${isFlashcardComplete}`)

            // Update the topic, recording the last practice date
            const result = await topicStore.updateTopicGeneration(eventPayload.topicId, eventPayload.generation, count, isFlashcardComplete);
        
            logger.compute(cid, `Topic ${eventPayload.topicId} updated with generation ${eventPayload.generation} and flashcards count ${count}. Modified count: ${result}`)

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