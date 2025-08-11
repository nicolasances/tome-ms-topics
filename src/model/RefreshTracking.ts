import { WithId } from "mongodb";

export class RefreshTrackingRecord {

    topicId: string; 
    sectionCode: string; 
    flashcardsType: string; 
    expectedNumFlashcards: number;  // Tracks how many flashcards are expected in the section, based on the events received from tome-ms-flashcards

    constructor(topicId: string, sectionCode: string, flashcardsType: string, expectedNumFlashcards: number) {
        this.topicId = topicId;
        this.sectionCode = sectionCode;
        this.flashcardsType = flashcardsType;
        this.expectedNumFlashcards = expectedNumFlashcards;
    }

    toBSON() {
        return {
            topicId: this.topicId,
            sectionCode: this.sectionCode,
            flashcardsType: this.flashcardsType,
            expectedNumFlashcards: this.expectedNumFlashcards
        };
    }

    static fromBSON(data: WithId<any>): RefreshTrackingRecord {
        return new RefreshTrackingRecord(
            data.topicId,
            data.sectionCode,
            data.flashcardsType,
            data.expectedNumFlashcards
        );
    }
}