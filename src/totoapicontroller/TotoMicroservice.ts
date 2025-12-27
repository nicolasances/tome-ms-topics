import { SNSImpl } from "./evt/impl/aws/SNSImpl";
import { GCPPubSubImpl } from "./evt/impl/gcp/GCPPubSubImpl";
import { TotoMessageBus, TotoMessageHandler } from "./evt/MessageBus";
import { TotoControllerConfig } from "./model/TotoControllerConfig";
import { TotoDelegate } from "./model/TotoDelegate";
import { TotoAPIController } from "./TotoAPIController";
import { SecretsManager } from "./util/CrossCloudSecret";
import { Logger } from "./logger/TotoLogger";

export class TotoMicroservice {

    private config: TotoControllerConfig;
    private apiController: TotoAPIController;
    private messageBus: TotoMessageBus;

    private static instance: TotoMicroservice;
    private static instancePromise: Promise<TotoMicroservice> | null = null;

    private constructor(config: TotoControllerConfig, apiController: TotoAPIController, messageBus: TotoMessageBus) {
        this.config = config;
        this.apiController = apiController;
        this.messageBus = messageBus;
    }

    public static async init(config: TotoMicroserviceConfiguration): Promise<TotoMicroservice> {

        if (TotoMicroservice.instance) return TotoMicroservice.instance;
        if (TotoMicroservice.instancePromise) return TotoMicroservice.instancePromise;

        // Instantiate the Microservice custom configuration
        const customConfig = new config.config(
            new SecretsManager(config.environment)
        );

        TotoMicroservice.instancePromise = customConfig.load().then(() => {

            // Create the API controller
            const apiController = new TotoAPIController(customConfig, { basePath: config.basePath });
            const logger = new Logger(config.apiName);

            // Determine message bus implementations based on the hyperscaler
            const awsMessageBus = config.environment.hyperscaler === "aws" ? new SNSImpl({ awsRegion: (config.environment.hyperscalerConfiguration as AWSConfiguration).awsRegion }) : undefined;
            const gcpMessageBus = config.environment.hyperscaler === "gcp" ? new GCPPubSubImpl({ expectedAudience: customConfig.getExpectedAudience() }) : undefined;

            // Create the message bus
            const bus = new TotoMessageBus({
                controller: apiController,
                messageBusImplementations: {
                    gcp: gcpMessageBus,
                    aws: awsMessageBus
                }
            });

            // Register the message handlers
            if (config.messageHandlers) {
                for (const handler of config.messageHandlers) {
                    bus.registerMessageHandler(handler);
                }
            }

            // Register the API endpoints
            if (config.apiEndpoints) {
                for (const endpoint of config.apiEndpoints) {

                    // Create an instance of the delegate
                    const delegateInstance = new endpoint.delegate(bus, customConfig, logger);

                    // Add the endpoint to the controller
                    apiController.path(endpoint.method, endpoint.path, delegateInstance);
                }
            }

            return new TotoMicroservice(customConfig, apiController, bus);
        });

        return TotoMicroservice.instancePromise;

    }

    public async start() {
        this.apiController.listen()
    }
}

export interface TotoMicroserviceConfiguration {
    apiName: string;
    basePath?: string;
    environment: TotoEnvironment;
    config: new (secretsManager: SecretsManager) => TotoControllerConfig;
    apiEndpoints?: TotoAPIEndpoint[];
    messageHandlers?: TotoMessageHandler[];
}

export interface TotoAPIEndpoint {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    delegate: new (messageBus: TotoMessageBus, config: TotoControllerConfig, logger: Logger) => TotoDelegate;
}

export type SupportedHyperscalers = "aws" | "gcp" | "azure";
export interface GCPConfiguration {
    gcpProjectId: string;
}

export interface TotoEnvironment {
    hyperscaler: SupportedHyperscalers;
    hyperscalerConfiguration: GCPConfiguration | AWSConfiguration | AzureConfiguration;
}

export interface AWSConfiguration {
    environment: "dev" | "test" | "prod";
    awsRegion: string;
}
export interface AzureConfiguration {
    azureRegion: string;
}