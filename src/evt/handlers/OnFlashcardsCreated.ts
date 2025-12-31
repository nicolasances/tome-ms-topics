import { ControllerConfig } from "../../Config";
import { TopicsStore } from "../../store/TopicsStore";
import { FlashcardsCreatedEvent } from "../model/FlashcardsCreatedEvent";
import { FlashcardsAPI } from "../../api/FlashcardsAPI";
import { RefreshTrackingRecord } from "../../model/RefreshTracking";
import { TrackingStore } from "../../store/TrackingStore";
import { isTopicGenerationComplete } from "../../util/RefreshTrackingUtil";
import { Logger, newTotoServiceToken, TotoMessage, TotoRuntimeError, ValidationError } from "../../totoapicontroller";
import { ProcessingResponse, TotoMessageHandler } from "../../totoapicontroller/evt/TotoMessageHandler";

export class OnFlashcardsCreated extends TotoMessageHandler {

    protected handledMessageType: string = 'flashcardsCreated';

    async onMessage(msg: TotoMessage): Promise<ProcessingResponse> {

        const logger = Logger.getInstance();
        const config = this.config as ControllerConfig;
        const cid = msg.cid;

        const eventPayload = msg.data as FlashcardsCreatedEvent;

        logger.compute(cid, `Flashcards created event: [${JSON.stringify(eventPayload)}]`)
        logger.compute(cid, `Updating topic ${eventPayload.topicId} - ${eventPayload.topicCode}`)

        try {

            const db = await config.getMongoDb(config.getDBName());

            const topicStore = new TopicsStore(db, config);
            const trackingStore = new TrackingStore(db, config);

            await trackingStore.saveRecord(new RefreshTrackingRecord(eventPayload.topicId, eventPayload.sectionCode, eventPayload.type, eventPayload.count));

            // 1. Retrieve the number of flashcards that the topic has so far
            const jwtToken = newTotoServiceToken(config);

            const { flashcards } = await new FlashcardsAPI(this.cid!, jwtToken).getFlashcards(eventPayload.topicId);
            const flashcardTypes = await new FlashcardsAPI(this.cid!, jwtToken).getFlashcardTypes();

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
                generation = await new FlashcardsAPI(this.cid!, jwtToken).getLatestFlashcardsGeneration().then(res => res.latestGeneration);

            // Update the topic, recording the last practice date
            const result = await topicStore.updateTopicGeneration(eventPayload.topicId, generation, count, isFlashcardComplete);

            logger.compute(cid, `Topic ${eventPayload.topicId} updated with generation ${generation} and flashcards count ${count}. Modified count: ${result}`)

            return { status: 'processed', responsePayload: 'Flashcards created event processed' };

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

    }
}