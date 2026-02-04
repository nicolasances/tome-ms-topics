import { Db, ObjectId } from "mongodb";
import { GeoArea, GeoAreaMetadata, Topic } from "../model/Topic";
import { ControllerConfig } from "../Config";
import { Practice } from "../model/Practice";
import { ValidationError } from "totoms";

export class TopicsStore {

    db: Db;
    topicsCollection: string;

    constructor(db: Db, config: ControllerConfig) {
        this.db = db;
        this.topicsCollection = config.getCollections().topics;
    }

    async findTopicByName(name: string, user: string): Promise<Topic | null> {

        const result = await this.db.collection(this.topicsCollection).findOne({ name: name, user: user })

        if (!result) return null;

        return Topic.fromBSON(result);

    }

    /**
     * Finds a topic by its ID for a given user.
     */
    async findTopicById(id: string): Promise<Topic | null> {

        const result = await this.db.collection(this.topicsCollection).findOne({ _id: new ObjectId(id) });

        if (!result) return null;

        return Topic.fromBSON(result);
    }

    /**
     * Finds all topics for a given user.
     * Returns an array of Topic objects.
     */
    async findTopicsByUser(user: string): Promise<Topic[]> {

        const results = await this.db.collection(this.topicsCollection).find({ user: user }).toArray();

        return results.map(Topic.fromBSON);
    }

    /**
     * Deletes the topic with the specified ID.
     */
    async deleteTopicById(id: string, user: string): Promise<number> {

        const result = await this.db.collection(this.topicsCollection).deleteOne({ _id: new ObjectId(id), user: user });

        return result.deletedCount

    }

    /**
     * Updates the topic after a practice has finished
     * 
     * @param topicId the topic id
     * @param practice the last practice
     * @returns the updated count
     */
    async updateTopicLastPractice(topicId: string, practice: Practice): Promise<number> {

        const result = await this.db.collection(this.topicsCollection).updateOne({ _id: new ObjectId(topicId) }, { $set: { lastPracticed: practice.finishedOn } })

        return result.modifiedCount;
    }

    /**
     * Updates the metadata of a topic.
     * @param topicId the topic id
     * @returns 
     */
    async updateTopicMetadata(topicId: string, metadata: TopicMetadata): Promise<number> {

        const update = { $set: {} } as any;

        if (metadata.numSections != null) update.$set.numSections = metadata.numSections;
        if (metadata.flashcardsGenerationComplete !== null) update.$set.isFlashcardGenerationComplete = metadata.flashcardsGenerationComplete;
        if (metadata.sections !== null) update.$set.sections = metadata.sections;
        if (metadata.topicCode !== null) update.$set.topicCode = metadata.topicCode;
        if (metadata.icon != null) update.$set.icon = metadata.icon;
        if (metadata.geoArea != null) update.$set.geoArea = metadata.geoArea;

        const result = await this.db.collection(this.topicsCollection).updateOne({ _id: new ObjectId(topicId) }, update);

        return result.modifiedCount;
    }

    /**
     * Updates the topic after flashcards have been created
     * 
     * @param topicId the topic id
     * @param generation the flashcards generation and count
     * @param flashcardsCount the number of flashcards created
     * @returns the updated count
     */
    async updateTopicGeneration(topicId: string, generation: string, flashcardsCount: number, isFlashcardGenerationComplete: boolean): Promise<number> {

        const result = await this.db.collection(this.topicsCollection).updateOne({ _id: new ObjectId(topicId) }, { $set: { generation: generation, flashcardsCount: flashcardsCount, isFlashcardGenerationComplete: isFlashcardGenerationComplete } })

        return result.modifiedCount;
    }

    /**
     * Saves the specified topic to the database. 
     * Returns the ID of the inserted topic. 
     */
    async saveTopic(topic: Topic): Promise<string> {

        const result = await this.db.collection(this.topicsCollection).insertOne(topic.toBSON());

        if (!result.acknowledged) throw new Error("Failed to save topic");

        return result.insertedId.toString();
    }

}

export class TopicMetadata {
    topicCode?: string;
    sections?: string;
    numSections?: number;
    flashcardsGenerationComplete?: boolean;
    icon?: string;
    geoArea?: GeoAreaMetadata;

    constructor(metadata: TopicMetadata) {
        this.topicCode = metadata.topicCode;
        this.sections = metadata.sections;
        this.numSections = metadata.numSections;
        this.flashcardsGenerationComplete = metadata.flashcardsGenerationComplete;
        this.icon = metadata.icon;
        this.geoArea = metadata.geoArea;
    }

    static fromHTTPBody(body: any): TopicMetadata {

        // Validate
        // If the geoArea is present, validate its structure
        if (body.geoArea) {
            if (typeof body.geoArea !== "object" || !body.geoArea.mainArea || !Array.isArray(body.geoArea.allAreas)) {
                throw new ValidationError(400, "Invalid geoArea format in TopicMetadata");
            }
        }

        return new TopicMetadata({
            topicCode: body.topicCode,
            sections: body.sections,
            numSections: body.numSections,
            flashcardsGenerationComplete: body.flashcardsGenerationComplete,
            icon: body.icon,
            geoArea: body.geoArea
        });
    }
}