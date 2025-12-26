import { TotoControllerConfig, ValidatorProps } from "./totoapicontroller";

const dbName = 'tometopics';
const collections = {
    topics: 'topics',
    tracking: 'tracking'
};

export class ControllerConfig extends TotoControllerConfig {

    mongoUser: string | undefined;
    mongoPwd: string | undefined;

    getMongoSecretNames(): { userSecretName: string; pwdSecretName: string; } | null {
        return { userSecretName: 'tome-ms-topics-mongo-user', pwdSecretName: 'tome-ms-topics-mongo-pswd' };
    }

    getProps(): ValidatorProps {
        return {
            noCorrelationId: true
        }
    }

    getDBName() { return dbName }
    getCollections() { return collections }

}