import { SNSImpl } from "./evt/impl/aws/SNSImpl";
import { GCPPubSubImpl } from "./evt/impl/gcp/GCPPubSubImpl";
import { TotoMessageBus, TotoMessageHandler } from "./evt/MessageBus";
import { TotoControllerConfig } from "./model/TotoControllerConfig";
import { TotoDelegate } from "./model/TotoDelegate";
import { TotoAPIController } from "./TotoAPIController";

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

        TotoMicroservice.instancePromise = config.config.load().then(() => {

            // Create the API controller
            const apiController = new TotoAPIController(config.config, { basePath: config.basePath });

            // Create the message bus
            const bus = new TotoMessageBus({
                controller: apiController,
                messageBusImplementations: {
                    gcp: new GCPPubSubImpl({ expectedAudience: config.config.getExpectedAudience() }),
                    aws: new SNSImpl({ awsRegion: process.env.AWS_REGION || "eu-north-1" })
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
                    const delegateInstance = new endpoint.delegate(bus, config.config);

                    // Add the endpoint to the controller
                    apiController.path(endpoint.method, endpoint.path, delegateInstance);
                }
            }

            return new TotoMicroservice(config.config, apiController, bus);
        });

        return TotoMicroservice.instancePromise;

    }

    public async start() {
        this.apiController.listen()
    }
}

export interface TotoMicroserviceConfiguration {
    basePath?: string;
    config: TotoControllerConfig;
    apiEndpoints?: TotoAPIEndpoint[];
    messageHandlers?: TotoMessageHandler[];
}

export interface TotoAPIEndpoint {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    delegate: new (messageBus: TotoMessageBus, config: TotoControllerConfig) => TotoDelegate;
}
