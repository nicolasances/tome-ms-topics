import { Db, ObjectId } from "mongodb";
import { Topic } from "../model/Topic";
import { ControllerConfig } from "../Config";
import { Practice } from "../model/Practice";

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
    async findTopicById(id: string, user: string): Promise<Topic | null> {

        const result = await this.db.collection(this.topicsCollection).findOne({ _id: new ObjectId(id), user: user });

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
     * Saves the specified topic to the database. 
     * Returns the ID of the inserted topic. 
     */
    async saveTopic(topic: Topic): Promise<string> {

        const result = await this.db.collection(this.topicsCollection).insertOne(topic.toBSON());

        if (!result.acknowledged) throw new Error("Failed to save topic");

        return result.insertedId.toString();
    }

}