import { WithId } from "mongodb";

export class Topic {

    id?: string; 
    topicCode?: string;
    name: string; 
    blogURL: string; 
    createdOn: string; // Date in format YYYYMMDD
    user: string; // User email
    lastPracticed?: string; // YYYYMMDD
    generation?: string; 
    flashcardsCount?: number; 
    flashcardsGenerationComplete?: boolean; // Whether the flashcard generation is complete
    numSections?: number; // Number of sections in the topic
    sections?: string[]; // Section codes in the topic

    constructor(name: string, blogURL: string, createdOn: string, user: string, lastPracticed?: string, generation?: string, flashcardsCount?: number, numSections?: number, flashcardsGenerationComplete?: boolean, topicCode?: string, sections?: string[]) {
        this.topicCode = topicCode;
        this.name = name;
        this.blogURL = blogURL;
        this.createdOn = createdOn;
        this.user = user;
        this.lastPracticed = lastPracticed;
        this.generation = generation;
        this.flashcardsCount = flashcardsCount;
        this.flashcardsGenerationComplete = flashcardsGenerationComplete;
        this.numSections = numSections;
        this.sections = sections;
    }

    static fromBSON(data: WithId<any>): Topic {
        
        let topic = new Topic(data.name, data.blogURL, data.createdOn, data.user, data.lastPracticed, data.generation, data.flashcardsCount, data.numSections, data.isFlashcardGenerationComplete, data.topicCode, data.sections);
        topic.id = data._id; 

        return topic;
    }

    toBSON(): any {
        return {
            topicCode: this.topicCode,
            name: this.name,
            blogURL: this.blogURL,
            createdOn: this.createdOn,
            user: this.user, 
            lastPracticed: this.lastPracticed, 
            generation: this.generation,
            flashcardsCount: this.flashcardsCount,
            numSections: this.numSections,
            isFlashcardGenerationComplete: this.flashcardsGenerationComplete,
            sections: this.sections,
        };
    }

}