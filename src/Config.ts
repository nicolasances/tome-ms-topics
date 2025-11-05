import { MongoClient } from 'mongodb';
import { Logger, SecretsManager, TotoControllerConfig } from "toto-api-controller";
import { ValidatorProps } from "./apicontroller/TotoAPIController";

const dbName = 'tometopics';
const collections = {
    topics: 'topics',
    tracking: 'tracking'
};

export class ControllerConfig implements TotoControllerConfig {

    private env: string;
    private hyperscaler: "aws" | "gcp" | "local";

    logger: Logger | undefined;
    mongoUser: string | undefined;
    mongoPwd: string | undefined;
    mongoHost: string | undefined;
    expectedAudience: string | undefined;
    totoAuthEndpoint: string | undefined;

    constructor() {

        this.hyperscaler = process.env.HYPERSCALER == 'aws' ? 'aws' : (process.env.HYPERSCALER == 'gcp' ? 'gcp' : 'local');

        let env = process.env.HYPERSCALER == 'aws' ? (process.env.ENVIRONMENT ?? 'dev') : process.env.GCP_PID;
        if (!env) env = 'dev';
        this.env = env;

    }


    async load(): Promise<any> {

        let promises = [];

        const secretsManager = new SecretsManager(this.hyperscaler == 'local' ? 'gcp' : this.hyperscaler, this.env, this.logger!);  // Use GCP Secrets Manager when local

        promises.push(secretsManager.getSecret('mongo-host').then((value) => {
            this.mongoHost = value;
        }));
        promises.push(secretsManager.getSecret('toto-expected-audience').then((value) => {
            this.expectedAudience = value;
        }));
        promises.push(secretsManager.getSecret('tome-ms-topics-mongo-user').then((value) => {
            this.mongoUser = value;
        }));
        promises.push(secretsManager.getSecret('tome-ms-topics-mongo-pswd').then((value) => {
            this.mongoPwd = value;
        }));

        await Promise.all(promises);

    }

    getProps(): ValidatorProps {

        return {
            noCorrelationId: true
        }
    }

    async getMongoClient() {

        // Use 'admin' as the authentication database; change if needed
        const mongoUrl = `mongodb://${this.mongoUser}:${this.mongoPwd}@${this.mongoHost}:27017/?authSource=${dbName}`

        return await new MongoClient(mongoUrl).connect();
    }

    getSigningKey(): string {
        throw new Error("Method not implemented.");
    }


    getExpectedAudience(): string {
        return String(this.expectedAudience)
    }

    getDBName() { return dbName }
    getCollections() { return collections }

}
