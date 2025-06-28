
export interface Practice {

    id?: string;
    user: string;
    topicId: string;
    type: PracticeType;
    startedOn: string; // YYYYMMDD
    finishedOn?: string; // YYYYMMDD
    score?: number; // Percentage
    stats?: PracticeStats; 

}

export interface PracticeStats {

    averageAttempts: number;    // The average number of attempts before getting the answer right
    totalWrongAnswers: number;  // The absolute total number of wrong answers (if a users gets it 2 times wrong on a question before getting the right answer, the number of wrong answers for that question is 2 and gets summed to this total)
    numCards: number;           // The total number of flashcards
    
}

export type PracticeType = "options" | "gaps"