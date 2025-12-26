
import http from "request";
import { ExecutionContext } from "../totoapicontroller";

export class FlashcardsAPI {

    endpoint: string;
    cid: string | undefined;
    authHeader: string;

    constructor(execContext: ExecutionContext, jwtToken: string) {
        this.endpoint = String(process.env['TOME_FLASHCARDS_API_ENDPOINT']);
        this.cid = execContext.cid;
        this.authHeader = `Bearer ${jwtToken}`;
    }

    /**
     * Fetches the list of flashcard types supported by the API.
     * 
     * @returns A list of flashcard types supported by the API.
     */
    async getFlashcardTypes(): Promise<GetFlashcardTypesResponse> {
        
        return await new Promise<GetFlashcardTypesResponse>((resolve, reject) => {
            http({
                uri: `${this.endpoint}/flashcardtypes`,
                method: 'GET',
                headers: {
                    'x-correlation-id': this.cid,
                    'Authorization': this.authHeader
                }
            }, (err: any, resp: any, body: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(JSON.parse(body));
                }
            });
        });
    }

    /**
     * Fetches the latest generation of flashcards
     */
    async getLatestFlashcardsGeneration(): Promise<GetLatestFlashcardsGenerationResponse> {
        
        return await new Promise<GetLatestFlashcardsGenerationResponse>((resolve, reject) => {
            http({
                uri: `${this.endpoint}/generation/latest`,
                method: 'GET',
                headers: {
                    'x-correlation-id': this.cid,
                    'Authorization': this.authHeader
                }
            }, (err: any, resp: any, body: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(JSON.parse(body));
                }
            });
        });
    }

    /**
     * Fetches the list of flashcards for a specific topic.
     * @param topicId The ID of the topic to fetch flashcards for.
     * @returns A list of flashcards for the specified topic.
     */
    async getFlashcards(topicId: string): Promise<GetFlashcardsResponse> {

        return await new Promise<GetFlashcardsResponse>((resolve, reject) => {
            http({
                uri: `${this.endpoint}/flashcards?topicId=${topicId}`,
                method: 'GET',
                headers: {
                    'x-correlation-id': this.cid,
                    'Authorization': this.authHeader
                }
            }, (err: any, resp: any, body: any) => {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    resolve(JSON.parse(body));
                }
            });
        });
    }
}

export interface GetLatestFlashcardsGenerationResponse {
    latestGeneration: string;
}

export interface GetFlashcardTypesResponse {
    supported: string[];
    generated: string[];
}

export type Flashcard = MultipleOptionsFlashcard | SectionTimelineFlashcard | DateFlashcard | GraphFlashcard;

export interface GetFlashcardsResponse {

    flashcards: Flashcard[];

}

interface GenericFlashcard {
    type: string; 
    user: string; 
    topicId: string; 
    topicCode: string; 
    sectionCode: string;
    sectionIndex: number;
}

export interface GraphFlashcard extends GenericFlashcard {
}

export interface DateFlashcard  extends GenericFlashcard {

    question: string; 
    correctYear: number;
}

export interface MultipleOptionsFlashcard extends GenericFlashcard {

    question: string; 
    options: string[];
    rightAnswerIndex: number; 
    id?: string;
    sectionShortTitle: string;
}
export interface SectionTimelineFlashcard extends GenericFlashcard {
    id?: string;
    sectionTitle: string; 
    sectionShortTitle: string;
    events: SectionTimelineEvent[]; 
}

export interface SectionTimelineEvent {

    event: string;
    date: string; 
    dateFormat: string;
    real: boolean;
    order: number;

}