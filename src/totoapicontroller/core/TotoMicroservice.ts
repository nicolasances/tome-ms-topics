import { TopicIdentifier, TotoMessageBus, TotoMessageHandler, TotoControllerConfig, TotoAPIController, SecretsManager, Logger, APIConfiguration, TotoEnvironment } from '..';

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

        Logger.init(config.serviceName);

        const secretsManager = new SecretsManager(config.environment);

        // Instantiate the Microservice-specific configuration
        const customConfig = new config.customConfiguration(secretsManager);

        // If there are secrets to load for the message bus, load them now
        let topicNames = undefined;
        if (config.messageBusConfiguration && config.messageBusConfiguration.topics) {

            // Load the topic names (resource identifiers) from Secrets Manager
            const topicNamesSecrets = config.messageBusConfiguration.topics.map(topic => topic.secret);

            const topicNamesPromises = topicNamesSecrets.map(async (secretName) => {
                const secretValue = await secretsManager.getSecret(secretName);

                return { logicalName: secretName, resourceIdentifier: secretValue } as TopicIdentifier;
            });

            topicNames = await Promise.all(topicNamesPromises);
        }

        // Load the customer configuration
        TotoMicroservice.instancePromise = customConfig.load().then(() => {

            // Create the API controller
            const apiController = new TotoAPIController({ apiName: config.serviceName, config: customConfig, environment: config.environment }, { basePath: config.basePath });

            // Create the message bus
            const bus = new TotoMessageBus({
                controller: apiController,
                customConfig: customConfig,
                topics: topicNames, 
                environment: config.environment
            });

            // Register the message handlers
            if (config.messageBusConfiguration && config.messageBusConfiguration.messageHandlers) {
                for (const handler of config.messageBusConfiguration.messageHandlers) {
                    bus.registerMessageHandler(new handler(customConfig));
                }
            }

            // Register the API endpoints
            if (config.apiConfiguration && config.apiConfiguration.apiEndpoints) {

                for (const endpoint of config.apiConfiguration.apiEndpoints) {

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
}

export interface TotoMicroserviceConfiguration {
    serviceName: string;
    basePath?: string;
    environment: TotoEnvironment;
    customConfiguration: new (secretsManager: SecretsManager) => TotoControllerConfig;
    apiConfiguration: APIConfiguration; 
    messageBusConfiguration?: MessageBusConfiguration;
}

export interface MessageBusConfiguration {
    topics: { logicalName: string; secret: string }[];
    messageHandlers?: (new (config: TotoControllerConfig) => TotoMessageHandler)[];
}