
export class FlashcardsCreatedEvent {

    topicCode: string; 
    topicId: string; 
    sectionCode: string; 
    type: string;
    count: number; // Number of flashcards created

    constructor(topicCode: string, topicId: string, sectionCode: string, type: string, count: number) {
        this.topicCode = topicCode;
        this.topicId = topicId;
        this.sectionCode = sectionCode;
        this.type = type;
        this.count = count;
    }

}