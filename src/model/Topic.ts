import { WithId } from "mongodb";

export class Topic {

    id?: string; 
    name: string; 
    blogURL: string; 
    createdOn: string; // Date in format YYYYMMDD
    user: string; // User email
    lastPracticed?: string; // YYYYMMDD

    constructor(name: string, blogURL: string, createdOn: string, user: string, lastPracticed?: string) {
        this.name = name;
        this.blogURL = blogURL;
        this.createdOn = createdOn;
        this.user = user;
        this.lastPracticed = lastPracticed;
    }

    static fromBSON(data: WithId<any>): Topic {
        let topic = new Topic(data.name, data.blogURL, data.createdOn, data.user, data.lastPracticed);
        topic.id = data._id; 

        return topic;
    }

    toBSON(): any {
        return {
            name: this.name,
            blogURL: this.blogURL,
            createdOn: this.createdOn,
            user: this.user, 
            lastPracticed: this.lastPracticed
        };
    }

}