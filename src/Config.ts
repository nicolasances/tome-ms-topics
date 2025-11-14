import { MongoClient } from 'mongodb';
import { ConfigurationData, Logger, SecretsManager, TotoControllerConfig, ValidatorProps } from "toto-api-controller";
import { TotoControllerConfigOptions } from 'toto-api-controller/dist/model/TotoControllerConfig';

const dbName = 'tometopics';
const collections = {
    topics: 'topics',
    tracking: 'tracking'
};

export class ControllerConfig extends TotoControllerConfig {

    mongoUser: string | undefined;
    mongoPwd: string | undefined;

    constructor(configuration: ConfigurationData, options: TotoControllerConfigOptions) {

        super(configuration, options);

    }

    async load(): Promise<any> {
        
        let promises = [];

        const secretsManager = new SecretsManager(this.hyperscaler == 'local' ? 'aws' : this.hyperscaler, this.env, this.logger!);  

        promises.push(super.load());

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
        const mongoUrl = `mongodb://${this.mongoUser}:${this.mongoPwd}@${this.mongoHost}:27017/?authSource=${dbName}`;

        return await new MongoClient(mongoUrl).connect();
    }

    getDBName() { return dbName }
    getCollections() { return collections }

}