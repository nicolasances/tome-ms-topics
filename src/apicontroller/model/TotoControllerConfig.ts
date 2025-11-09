import { Logger } from "../logger/TotoLogger";
import { SecretsManager } from "../TotoAPIController";
import { ValidatorProps } from "./ValidatorProps";

export abstract class TotoControllerConfig {

    configuration: ConfigurationData;
    logger: Logger | undefined;

    hyperscaler: "aws" | "gcp" | "local";
    env: string;
    
    protected mongoHost: string | undefined;
    protected jwtSigningKey: string | undefined;
    protected expectedAudience: string | undefined;

    constructor(configuration: ConfigurationData) {

        this.hyperscaler = process.env.HYPERSCALER == 'aws' ? 'aws' : (process.env.HYPERSCALER == 'gcp' ? 'gcp' : 'local');

        let env = process.env.HYPERSCALER == 'aws' ? (process.env.ENVIRONMENT ?? 'dev') : process.env.GCP_PID;
        if (!env) env = 'dev';
        this.env = env;

        this.configuration = configuration;

    }

    /**
     * Loads the configurations and returns a Promise when done
     */
    async load(): Promise<any> {

        let promises = [];

        const secretsManager = new SecretsManager(this.hyperscaler == 'local' ? 'gcp' : this.hyperscaler, this.env, this.logger!);  // Use GCP Secrets Manager when local

        promises.push(secretsManager.getSecret('mongo-host').then((value) => {
            this.mongoHost = value;
        }));
        promises.push(secretsManager.getSecret('jwt-signing-key').then((value) => {
            this.jwtSigningKey = value;
        }));
        promises.push(secretsManager.getSecret('toto-expected-audience').then((value) => {
            this.expectedAudience = value;
        }));

        await Promise.all(promises);

    }

    /**
     * Returns the Validator Properties
     */
    abstract getProps(): ValidatorProps

    /**
     * Return the JWT Token Signing Key for custom tokens
     */
    getSigningKey(): string {
        return this.jwtSigningKey!;
    }

    /**
     * Returns the expected audience. 
     * The expected audience is used when verifying the Authorization's header Bearer JWT token.
     * The audience is extracted from the token and compared with the expected audience, to make sure 
     * that the token was issued for the correct purpose (audience).
     */
    getExpectedAudience(): string {
        return String(this.expectedAudience)
    }

    /**
     * Returns the name of the API (service, microservice) managed by this controller.
     */
    getAPIName(): string {
        return this.configuration.apiName;
    }

}

export interface ConfigurationData {
    apiName: string;
}