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
        
        Logger.init(config.apiName);

        // Instantiate the Microservice custom configuration
        const customConfig = new config.config(
            new SecretsManager(config.environment)
        );

        TotoMicroservice.instancePromise = customConfig.load().then(() => {

            // Create the API controller
            const apiController = new TotoAPIController({apiName: config.apiName, config: customConfig, environment: config.environment}, { basePath: config.basePath });

            // Create the message bus
            const bus = new TotoMessageBus({
                controller: apiController,
                messageBusImplementation: TotoMicroservice.getMessageBusImplementation(config, customConfig),
                customConfig: customConfig
            });

            // Register the message handlers
            if (config.messageHandlers) {
                for (const handler of config.messageHandlers) {
                    bus.registerMessageHandler(new handler(customConfig));
                }
            }

            // Register the API endpoints
            if (config.apiEndpoints) {
                for (const endpoint of config.apiEndpoints) {

                    // Create an instance of the delegate
                    const delegateInstance = new endpoint.delegate(bus, customConfig);

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

    public static getMessageBusImplementation(config: TotoMicroserviceConfiguration, customConfig: TotoControllerConfig): any {
        if (config.environment.hyperscaler === "aws") return new SNSImpl({ awsRegion: (config.environment.hyperscalerConfiguration as AWSConfiguration).awsRegion });
        if (config.environment.hyperscaler === "gcp") return new GCPPubSubImpl({ expectedAudience: customConfig.getExpectedAudience() });
        return null;
    }
}

export interface TotoMicroserviceConfiguration {
    apiName: string;
    basePath?: string;
    environment: TotoEnvironment;
    config: new (secretsManager: SecretsManager) => TotoControllerConfig;
    apiEndpoints?: TotoAPIEndpoint[];
    messageHandlers?: (new (config: TotoControllerConfig) => TotoMessageHandler)[];
}

export interface TotoAPIEndpoint {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    delegate: new (messageBus: TotoMessageBus, config: TotoControllerConfig) => TotoDelegate;
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