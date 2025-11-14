import { Db, ObjectId } from "mongodb";
import { Topic } from "../model/Topic";
import { ControllerConfig } from "../Config";
import { Practice } from "../model/Practice";
import { RefreshTrackingRecord } from "../model/RefreshTracking";

export class TrackingStore {

    db: Db;
    trackingCollection: string;

    constructor(db: Db, config: ControllerConfig) {
        this.db = db;
        this.trackingCollection = config.getCollections().tracking;
    }

    /**
     * Saves a refresh tracking record to the database.
     * @param record The refresh tracking record to save.
     * @returns The ID of the inserted record.
     */
    async saveRecord(record: RefreshTrackingRecord) {
        
        const insertedId = await this.db.collection(this.trackingCollection).insertOne(record.toBSON());

        return insertedId.insertedId;

    }

    /**
     * Returns all refresh tracking records for a specific topic.
     * 
     * @param topicId The ID of the topic to get the refresh tracking records for.
     * @returns 
     */
    async getRecordsByTopicId(topicId: string): Promise<RefreshTrackingRecord[] | null> {

        const record = await this.db.collection(this.trackingCollection).find({ topicId: topicId }).toArray();

        return record.map(r => RefreshTrackingRecord.fromBSON(r));
    }

    /**
     * Deletes all refresh tracking records for a specific topic.
     * 
     * @param topicId The ID of the topic to delete the refresh tracking records for.
     * @returns 
     */
    async deleteAllRecords(topicId: string): Promise<number> {

        const result = await this.db.collection(this.trackingCollection).deleteMany({ topicId: topicId });

        return result.deletedCount;
    }

}