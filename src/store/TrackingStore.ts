import { Db, ObjectId } from "mongodb";
import { Topic } from "../model/Topic";
import { ControllerConfig } from "../Config";
import { Practice } from "../model/Practice";

export class TrackingStore {

    db: Db;
    topicsCollection: string;

    constructor(db: Db, config: ControllerConfig) {
        this.db = db;
        this.topicsCollection = config.getCollections().topics;
    }

}