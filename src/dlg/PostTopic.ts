import { Request } from "express";
import { ControllerConfig } from "../Config";
import { TotoDelegate } from "toto-api-controller/dist/model/TotoDelegate";
import { UserContext } from "toto-api-controller/dist/model/UserContext";
import { ExecutionContext } from "toto-api-controller/dist/model/ExecutionContext";
import { ValidationError } from "toto-api-controller/dist/validation/Validator";
import { TotoRuntimeError } from "toto-api-controller/dist/model/TotoRuntimeError";
import { TopicsStore } from "../store/TopicsStore";
import { Topic } from "../model/Topic";
import moment from "moment-timezone";
import { EventPublisher } from "../evt/EventPublisher";


export class PostTopic implements TotoDelegate {

    async do(req: Request, userContext: UserContext, execContext: ExecutionContext): Promise<any> {

        const body = req.body
        const logger = execContext.logger;
        const cid = execContext.cid;
        const config = execContext.config as ControllerConfig;

        // Validate mandatory fields
        if (!body.name) throw new ValidationError(400, "No name provided"); 
        if (!body.blogURL) throw new ValidationError(400, "No Blog URL provided"); 

        // Extract user
        const user = userContext.email;

        let client;

        try {

            // Instantiate the DB
            client = await config.getMongoClient();
            const db = client.db(config.getDBName());

            const topicStore = new TopicsStore(db, config); 

            // Check that the topic does not already exist
            const preexistingTopic = await topicStore.findTopicByName(body.name, user);

            if (preexistingTopic) throw new ValidationError(400, `Topic with name ${body.name} already exists. It was created by user ${preexistingTopic.user}.`);

            // Save the topic 
            const topic = new Topic(body.name, body.blogURL, moment().tz("Europe/Rome").format("YYYYMMDD"), user);

            const id = await topicStore.saveTopic(topic);

            // Publish the event
            new EventPublisher(execContext, "tometopics").publishEvent(id, "topic_created", `Topic ${body.name} created by user ${user}`, topic);

            // Return something
            return {id: id}


        } catch (error) {

            logger.compute(cid, `${error}`, "error")

            if (error instanceof ValidationError || error instanceof TotoRuntimeError) {
                throw error;
            }
            else {
                console.log(error);
                throw error;
            }

        }
        finally {
            if (client) client.close();
        }

    }

}