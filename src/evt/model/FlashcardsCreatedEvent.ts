
export class FlashcardsCreatedEvent {

    generation: string; // Tracks the generation of flashcards
    topicCode: string; 
    topicId: string; 
    count: number; // Number of flashcards created

    constructor(generation: string, topicCode: string, topicId: string, count: number) {
        this.generation = generation;
        this.topicCode = topicCode;
        this.topicId = topicId;
        this.count = count;
    }

}