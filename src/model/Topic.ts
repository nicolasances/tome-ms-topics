import { WithId } from "mongodb";

export class Topic {

    id?: string; 
    name: string; 
    blogURL: string; 
    createdOn: string; // Date in format YYYYMMDD
    user: string; // User email
    lastPracticed?: string; // YYYYMMDD
    generation?: string; 
    flashcardsCount?: number; 
    flashcardsGenerationComplete?: boolean; // Whether the flashcard generation is complete
    numSections?: number; // Number of sections in the topic

    constructor(name: string, blogURL: string, createdOn: string, user: string, lastPracticed?: string, generation?: string, flashcardsCount?: number, numSections?: number, flashcardsGenerationComplete?: boolean) {
        this.name = name;
        this.blogURL = blogURL;
        this.createdOn = createdOn;
        this.user = user;
        this.lastPracticed = lastPracticed;
        this.generation = generation;
        this.flashcardsCount = flashcardsCount;
        this.flashcardsGenerationComplete = flashcardsGenerationComplete;
        this.numSections = numSections;
    }

    static fromBSON(data: WithId<any>): Topic {
        let topic = new Topic(data.name, data.blogURL, data.createdOn, data.user, data.lastPracticed, data.generation, data.flashcardsCount, data.numSections, data.isFlashcardGenerationComplete);
        topic.id = data._id; 

        return topic;
    }

    toBSON(): any {
        return {
            name: this.name,
            blogURL: this.blogURL,
            createdOn: this.createdOn,
            user: this.user, 
            lastPracticed: this.lastPracticed, 
            generation: this.generation,
            flashcardsCount: this.flashcardsCount,
            numSections: this.numSections,
            isFlashcardGenerationComplete: this.flashcardsGenerationComplete,
        };
    }

}