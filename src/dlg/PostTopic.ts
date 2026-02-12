import { Request } from "express";
import { ControllerConfig } from "../Config";
import { TopicsStore } from "../store/TopicsStore";
import { Topic } from "../model/Topic";
import moment from "moment-timezone";
import { Logger, TotoDelegate, TotoRuntimeError, UserContext, ValidationError } from "totoms";
import { EVENTS } from "../evt/Events";


export class PostTopic extends TotoDelegate<PostTopicRequest, PostTopicResponse> {

    async do(req: PostTopicRequest, userContext: UserContext): Promise<PostTopicResponse> {

        const logger = Logger.getInstance();
        const config = this.config as ControllerConfig;

        // Extract user
        const user = userContext.email;

        try {

            const db = await config.getMongoDb(config.getDBName());

            const topicStore = new TopicsStore(db, config);

            // Check that the topic does not already exist
            const preexistingTopic = await topicStore.findTopicByName(req.name, user);

            if (preexistingTopic) throw new ValidationError(400, `Topic with name ${req.name} already exists. It was created by user ${preexistingTopic.user}.`);

            // Save the topic 
            const topic = new Topic(req.name, req.blogURL, moment().tz("Europe/Rome").format("YYYYMMDD"), user);

            const id = await topicStore.saveTopic(topic);

            // Publish the event
            // await new EventPublisher(execContext, "tometopics").publishEvent(id, EVENTS.topicCreated, `Topic ${req.name} created by user ${user}`, topic);
            await this.messageBus.publishMessage({ topic: "tometopics" }, {
                cid: this.cid!,
                id: id,
                type: EVENTS.topicCreated,
                msg: `Topic ${id} created by user ${user}`,
                timestamp: new Date().toISOString(),
                data: topic
            })

            // Return something
            return { id: id }


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

    public parseRequest(req: Request): PostTopicRequest {

        // Validate mandatory fields
        if (!req.body.name) throw new ValidationError(400, "No name provided");
        if (!req.body.blogURL) throw new ValidationError(400, "No Blog URL provided");

        return {
            name: req.body.name,
            blogURL: req.body.blogURL
        }
    }

}

interface PostTopicRequest {
    name: string;
    blogURL: string;
}

interface PostTopicResponse {
    id: string;
}