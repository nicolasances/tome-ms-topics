import { TotoControllerConfig, TotoDelegate, TotoMessageBus } from "..";

export interface OpenAPISpecification {
    localSpecsFilePath?: string; // Path to a local OpenAPI specification file - example: './openapi.yaml'
}

export interface APIConfiguration {

    /**
     * The list of API endpoints to be registered
     */
    apiEndpoints: TotoAPIEndpoint[];

    /**
     * Options for API validation and configuration
     */
    apiOptions?: APIOptions;

    /**
     * OPenAPI Specification configuration
     */
    openAPISpecification?: OpenAPISpecification;
}

export interface TotoAPIEndpoint {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    delegate: new (messageBus: TotoMessageBus, config: TotoControllerConfig) => TotoDelegate;
}

export interface APIOptions {

    /**
     * If this property is set to true, authentication (through the Authorization header) is not necessary
     * Default is false
     */
    noAuth?: boolean, 

    /**
     * If this property is set to true, the x-correlation-id header is not needed
     * Default is false
     */
    noCorrelationId?: boolean,

    /**
     * This property allows the backend to configure the min app version needed from the client in order to be supported
     * Default is null
     */
    minAppVersion?: string, 

    /**
     * This property is the name of the auth provider that is expected to be used as a custom auth provider. 
     * IMPORTANT: if none is used, then no custom auth provider can be used and JWT tokens with an unrecognized auth provider will be rejected.
     */
    customAuthProvider?: string;


}