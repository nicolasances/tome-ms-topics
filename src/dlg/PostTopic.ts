import { Request } from "express";
import { ControllerConfig } from "../Config";
import { TopicsStore } from "../store/TopicsStore";
import { Topic } from "../model/Topic";
import moment from "moment-timezone";
import { Logger, TotoDelegate, TotoRuntimeError, UserContext, ValidationError } from "../totoapicontroller";


export class PostTopic extends TotoDelegate {

    async do(req: Request, userContext: UserContext): Promise<any> {

        const body = req.body
        const logger = Logger.getInstance();
        const config = this.config as ControllerConfig;

        // Validate mandatory fields
        if (!body.name) throw new ValidationError(400, "No name provided"); 
        if (!body.blogURL) throw new ValidationError(400, "No Blog URL provided"); 

        // Extract user
        const user = userContext.email;

        try {

            const db = await config.getMongoDb(config.getDBName());

            const topicStore = new TopicsStore(db, config); 

            // Check that the topic does not already exist
            const preexistingTopic = await topicStore.findTopicByName(body.name, user);

            if (preexistingTopic) throw new ValidationError(400, `Topic with name ${body.name} already exists. It was created by user ${preexistingTopic.user}.`);

            // Save the topic 
            const topic = new Topic(body.name, body.blogURL, moment().tz("Europe/Rome").format("YYYYMMDD"), user);

            const id = await topicStore.saveTopic(topic);

            // Publish the event
            // await new EventPublisher(execContext, "tometopics").publishEvent(id, EVENTS.topicCreated, `Topic ${body.name} created by user ${user}`, topic);

            // Return something
            return {id: id}


        } catch (error) {

            logger.compute(this.cid, `${error}`, "error")

            if (error instanceof ValidationError || error instanceof TotoRuntimeError) {
                throw error;
            }
            else {
                console.log(error);
                throw error;
            }

        }

    }

}