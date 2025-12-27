import { TotoControllerConfig, APIOptions } from "./totoapicontroller";

const dbName = 'tometopics';
const collections = {
    topics: 'topics',
    tracking: 'tracking'
};

export class ControllerConfig extends TotoControllerConfig {

    mongoUser: string | undefined;
    mongoPwd: string | undefined;

    constructor(configuration: ConfigurationData) {

        super(configuration);

    }

    async load(): Promise<any> {
        
        let promises = [];

        const secretsManager = new SecretsManager(this.hyperscaler == 'local' ? 'gcp' : this.hyperscaler, this.env, this.logger!);  // Use GCP Secrets Manager when local

        promises.push(super.load());

        promises.push(secretsManager.getSecret('tome-ms-topics-mongo-user').then((value) => {
            this.mongoUser = value;
        }));
        promises.push(secretsManager.getSecret('tome-ms-topics-mongo-pswd').then((value) => {
            this.mongoPwd = value;
        }));

        await Promise.all(promises);

    }

    getProps(): APIOptions {
        return {
            noCorrelationId: true
        }
    }

    getDBName() { return dbName }
    getCollections() { return collections }

}