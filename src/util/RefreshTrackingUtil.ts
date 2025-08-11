
/**
 * This module contains utility functions for tracking the distributed process of flashcards creation after a refresh or creation of a new topic. 
 */

import { Flashcard } from "../api/FlashcardsAPI";
import { RefreshTrackingRecord } from "../model/RefreshTracking";

/**
 * Checks if the flashcard generation is complete for a specific topic.
 * 
 * The generation is complete if all these conditions are met:
 * 1. Generation is complete for all sections of the topic.
 * 
 * @param sectionCodes The list of section codes to check.
 * @param expectedTypes The list of expected flashcards types for the sections.
 * @param flashcards The list of flashcards to check against.
 * @param refreshTrackingRecords The list of refresh tracking records to check against.
 */
export function isTopicGenerationComplete(sectionCodes: string[], expectedTypes: string[], flashcards: Flashcard[], refreshTrackingRecords: RefreshTrackingRecord[]): boolean {

    for (const sectionCode of sectionCodes) {

        const sectionComplete = isSectionGenerationComplete(sectionCode, expectedTypes, flashcards, refreshTrackingRecords);

        if (!sectionComplete) return false;
    }

    return true;
}

/**
 * Checks if the flashcard generation is complete for a specific section.
 * 
 * The generation is complete if all these conditions are met:
 * 1. Generation is complete for all flashcards types for this section
 * 2. The expected flashcards types for this section are tracked in the refresh tracking records.
 * 
 * @param sectionCode The code of the section to check.
 * @param expectedTypes The list of expected flashcards types for the section.
 * @param flashcards The list of flashcards to check against.
 * @param refreshTrackingRecords The list of refresh tracking records to check against.
 */
export function isSectionGenerationComplete(sectionCode: string, expectedTypes: string[], flashcards: Flashcard[], refreshTrackingRecords: RefreshTrackingRecord[]): boolean {

    // Find the expected flashcards types for the section
    for (const type of expectedTypes) {

        // Check if generation is complete for this type 
        const typeGenerationComplete = isTypeGenerationComplete(sectionCode, type, flashcards, refreshTrackingRecords);

        if (!typeGenerationComplete) return false;
    }

    return true;
}
        

/**
 * Checks if the flashcard generation is complete for a specific section and flashcards type.
 * 
 * The generation is complete if all these conditions are met: 
 * 1. there are x flashcards with the given section code and flashcards type, where x is the expected number of flashcards for that section and type.
 * 2. The expected number of flashcards for that section and type is tracked in the refresh tracking records.
 * 
 * @param sectionCode The code of the section to check.
 * @param flashcardsType The type of flashcards to check.
 * @param flashcards The list of flashcards to check against.
 * @returns True if the generation is complete, false otherwise.
 */
export function isTypeGenerationComplete(sectionCode: string, flashcardsType: string, flashcards: Flashcard[], refreshTrackingRecords: RefreshTrackingRecord[]): boolean {
    
    // Find the expected number of flashcards for the section and type
    const record = refreshTrackingRecords.find(r => r.sectionCode === sectionCode && r.flashcardsType === flashcardsType);

    if (!record) {
        return false; // No record found for this section and type
    }

    // Count the number of flashcards with the given section code and type
    const count = flashcards.filter(f => f.sectionCode === sectionCode && f.type === flashcardsType).length;

    return count === record.expectedNumFlashcards;
}