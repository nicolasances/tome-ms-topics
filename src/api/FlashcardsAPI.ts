
import http from "request";
import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { ControllerConfig } from "../Config";

export class FlashcardsAPI {

    endpoint: string;
    cid: string | undefined;
    authHeader: string;

    constructor(execContext: ExecutionContext, authHeader: string) {
        this.endpoint = String(process.env['TOME_FLASHCARDS_API_ENDPOINT']);
        this.cid = execContext.cid;
        this.authHeader = authHeader;
    }

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

type Flashcard = MultipleOptionsFlashcard | SectionTimelineFlashcard;

export interface GetFlashcardsResponse {

    flashcards: Flashcard[];

}

export interface MultipleOptionsFlashcard {

    type: string;
    user: string;
    topicId: string; 
    topicCode: string; 
    question: string; 
    options: string[];
    rightAnswerIndex: number; 
    id?: string;
    sectionShortTitle: string;
}
export interface SectionTimelineFlashcard {
    id?: string;
    type: string;
    user: string;
    topicId: string;
    topicCode: string;
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