import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { Request } from "express";
import { TotoRuntimeError } from "toto-api-controller/dist/model/TotoRuntimeError";
import { ControllerConfig } from "../../Config";
import { ValidationError } from "toto-api-controller/dist/validation/Validator";
import { Practice } from "../../model/Practice";
import { TopicsStore } from "../../store/TopicsStore";
import { FlashcardsCreatedEvent } from "../model/FlashcardsCreatedEvent";
import { FlashcardsAPI } from "../../api/FlashcardsAPI";
import { RefreshTrackingRecord } from "../../model/RefreshTracking";
import { TrackingStore } from "../../store/TrackingStore";
import { isTopicGenerationComplete } from "../../util/RefreshTrackingUtil";
import { TotoMessage } from "../../apicontroller/TotoAPIController";
import { newTotoServiceToken } from "../../apicontroller/auth/TotoToken";

export class OnFlashcardsCreated {

    execContext: ExecutionContext;
    config: ControllerConfig;

    constructor(execContext: ExecutionContext) {
        this.execContext = execContext;
        this.config = execContext.config as ControllerConfig;
    }

    async do(msg: TotoMessage) {

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
            const trackingStore = new TrackingStore(db, this.config);

            await trackingStore.saveRecord(new RefreshTrackingRecord( eventPayload.topicId, eventPayload.sectionCode, eventPayload.type, eventPayload.count ));

            // 1. Retrieve the number of flashcards that the topic has so far
            const jwtToken = newTotoServiceToken(this.config);

            const { flashcards } = await new FlashcardsAPI(this.execContext, jwtToken).getFlashcards(eventPayload.topicId);
            const flashcardTypes = await new FlashcardsAPI(this.execContext, jwtToken).getFlashcardTypes();

            const count = flashcards.length;

            // 2. Check that if all sections have had flashcards created. We do that by counting the number of sections that have flashcards created and comparing that with the Topic's registered sections.
            // 2.1. Count the number of sections that have flashcards created
            const sectionCodes = new Set(flashcards.map(f => f.sectionCode));

            // 2.2. Get the topic's number of sections
            const topic = await topicStore.findTopicById(eventPayload.topicId);

            const expectedNumSections = topic?.numSections;
            const sectionsWithFlashcards = sectionCodes.size;

            let isFlashcardComplete = false; 
            if (sectionsWithFlashcards === expectedNumSections) {

                // Use the Tracking Utils to check if the flashcard generation is complete for the topic
                // 1. Get the tracking records for the topic
                const refreshTrackingRecords = await trackingStore.getRecordsByTopicId(eventPayload.topicId);

                // 2. Check if the flashcard generation is complete for all sections
                isFlashcardComplete = isTopicGenerationComplete(Array.from(sectionCodes), flashcardTypes.generated, flashcards, refreshTrackingRecords!);

            }

            logger.compute(cid, `Topic ${eventPayload.topicId} has ${sectionsWithFlashcards} sections with flashcards, expected ${expectedNumSections}. Flashcard complete: ${isFlashcardComplete}`)

            // If the generation is complete, get the latest generation 
            let generation = "-";
            if (isFlashcardComplete) 
                generation = await new FlashcardsAPI(this.execContext, jwtToken).getLatestFlashcardsGeneration().then(res => res.latestGeneration);

            // Update the topic, recording the last practice date
            const result = await topicStore.updateTopicGeneration(eventPayload.topicId, generation, count, isFlashcardComplete);
        
            logger.compute(cid, `Topic ${eventPayload.topicId} updated with generation ${generation} and flashcards count ${count}. Modified count: ${result}`)

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