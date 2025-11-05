
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { SecretsManager as AWSSecretsManager, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Logger } from '../logger/TotoLogger';

/**
 * This class is a utility class to extract secrets from different clouds. 
 * It supports:
 * - GCP Secret Manager
 * - AWS Secrets Manager
 */
export class SecretsManager {

    private provider: "aws" | "gcp";
    private environment: string;
    private logger: Logger;

    constructor(provider: "aws" | "gcp", environment: string, logger: Logger) {
        this.provider = provider;
        this.environment = environment;
        this.logger = logger;
    }

    getSecret(secretName: string): Promise<string> {

        if (this.provider == "aws") {
            return this.getSecretFromAWS(this.environment, secretName);
        } 
        else {
            return this.getSecretFromGCP(this.environment, secretName);
        }
    }

    /**
     * This function retrieves a secret from AWS Secrets Manager. 
     * Credentials are assumed to be provided by the environment (e.g. EC2 role, ECS role, etc)
     * 
     * @param environment the environment where the code is running (e.g. dev, test)
     * @param secretName the name of the secret in AWS Secrets Manager.
     */
    private getSecretFromAWS = async (environment: string, secretName: string): Promise<string> => {
    
        const fullSecretName = `${environment}/${secretName}`;
    
        this.logger.compute("", `Retrieving secret ${fullSecretName} from AWS Secrets Manager`);
    
        const client = new AWSSecretsManager({ region: process.env.AWS_REGION || 'eu-north-1' });
    
        const command = new GetSecretValueCommand({ SecretId: fullSecretName });
    
        const response = await client.send(command);
    
        if (!response || !response.SecretString) throw new Error(`No secret found for name ${fullSecretName}`);
    
        return response.SecretString;
    }
    
    /**
     * This function retrieves a secret from GCP Secret Manager. 
     * Credentials are assumed to be provided by the environment (e.g. GCE, GKE, Cloud Run, etc)
     * 
     * @param environment the environment where the code is running (e.g. dev, test). In GCP that is the GCP project ID!
     * @param secretName the name of the secret in GCP Secret Manager
     */
    private getSecretFromGCP = async (environment: string, secretName: string): Promise<string> => {

        this.logger.compute("", `Retrieving secret ${secretName} from GCP Secret Manager in project ${environment}`);
    
        const client = new SecretManagerServiceClient();
    
        const [version] = await client.accessSecretVersion({ name: `projects/${environment}/secrets/${secretName}/versions/latest` });
    
        if (!version || !version.payload || !version.payload.data) throw new Error(`No secret found for name ${secretName}`);
    
        return version.payload.data.toString();
    }   
}
