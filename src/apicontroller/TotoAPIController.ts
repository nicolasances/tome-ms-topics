import bodyParser from 'body-parser'
import busboy from 'connect-busboy'
import fs from 'fs-extra';
import express, { Express, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid';

import { Logger } from './logger/TotoLogger'
import { TotoControllerConfig } from './model/TotoControllerConfig'
import { LazyValidator, ValidationError, Validator } from './validation/Validator';
import { TotoDelegate } from './model/TotoDelegate';
import { ExecutionContext } from './model/ExecutionContext';
import { SmokeDelegate } from './dlg/SmokeDelegate';
import { TotoRuntimeError } from './model/TotoRuntimeError';
import { TotoPathOptions } from './model/TotoPathOptions';
import path from 'path';
import { ITotoPubSubEventHandler } from './evt/TotoPubSubEventHandler';
import { PubSubImplementationsFactory } from './evt/PubSubImplementationsFactory';
import { APubSubImplementation } from './evt/PubSubImplementation';
import { GCPPubSubImpl } from './evt/impl/gcp/GCPPubSubImpl';
import { SNSImpl } from './evt/impl/aws/SNSImpl';

export { APubSubImplementation, APubSubRequestValidator } from './evt/PubSubImplementation'
export { PubSubImplementationsFactory } from './evt/PubSubImplementationsFactory'
export { TotoMessage } from './evt/TotoMessage'
export { ITotoPubSubEventHandler } from './evt/TotoPubSubEventHandler'
export { Logger } from './logger/TotoLogger'
export { AUTH_PROVIDERS } from './model/AuthProviders'
export { ExecutionContext } from './model/ExecutionContext'
export { TotoControllerConfig, ConfigurationData } from './model/TotoControllerConfig'
export { FakeRequest, TotoDelegate } from './model/TotoDelegate'
export { TotoPathOptions } from './model/TotoPathOptions'
export { TotoRuntimeError } from './model/TotoRuntimeError'
export { UserContext } from './model/UserContext'
export { ValidatorProps } from './model/ValidatorProps'
export { correlationId } from './util/CorrelationId'
export { SecretsManager } from './util/CrossCloudSecret'
export { basicallyHandleError } from './util/ErrorUtil'
export { GCPPubSubRequestValidator } from './evt/impl/gcp/GCPPubSubRequestValidator';
export { SNSRequestValidator } from './evt/impl/aws/SNSRequestValidator';
export { googleAuthCheck } from './validation/GoogleAuthCheck'
export { ConfigMock, LazyValidator, ValidationError, Validator } from './validation/Validator'

export class TotoControllerOptions {
    debugMode?: boolean = false
    basePath?: string = undefined   // Use to prepend a base path to all API paths, e.g. '/api/v1' or '/expenses/v1'
    port?: number                   // Use to define the port on which the Express app will listen. Default is 8080
}

/**
 * This is an API controller to Toto APIs
 * It provides all the methods to create an API and it's methods & paths, to create the documentation automatically, etc.
 * Provides the following default paths:
 * '/'            : this is the default SMOKE (health check) path
 * '/publishes'   : this is the path that can be used to retrieve the list of topics that this API publishes events to
 */
export class TotoAPIController {

    app: Express;
    apiName: string;
    logger: Logger;
    validator: Validator = new LazyValidator();
    config: TotoControllerConfig;
    options: TotoControllerOptions;
    pubSubImplementationsFactory: PubSubImplementationsFactory;

    /**
     * The constructor requires the express app
     * Requires:
     * - apiName              : (mandatory) - the name of the api (e.g. expenses)
     * - config               : (mandatory) - a TotoControllerConfig instance
     */
    constructor(config: TotoControllerConfig, options: TotoControllerOptions = new TotoControllerOptions()) {

        this.app = express();
        this.apiName = config.getAPIName();
        this.logger = new Logger(this.apiName)
        this.config = config;
        this.options = {
            debugMode: options.debugMode ?? false,
            basePath: options.basePath,
            port: options.port ?? 8080
        };

        // Registering default PubSub implementations
        this.pubSubImplementationsFactory = new PubSubImplementationsFactory(this.config, this.logger);
        this.pubSubImplementationsFactory.registerImplementation(new GCPPubSubImpl(this.config, this.logger));
        this.pubSubImplementationsFactory.registerImplementation(new SNSImpl(this.config, this.logger));

        this.config.logger = this.logger;

        // Log some configuration properties
        if (options.debugMode) this.logger.compute("", `[TotoAPIController Debug] - Config Properties: ${JSON.stringify(config.getProps())}`)

        // Initialize the basic Express functionalities
        this.app.use(function (req: any, res: any, next: any) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-correlation-id, x-msg-id, auth-provider, x-app-version, x-client, x-client-id");
            res.header("Access-Control-Allow-Methods", "OPTIONS, GET, PUT, POST, DELETE");
            next();
        });

        this.app.use(bodyParser.json());
        this.app.use(busboy());
        this.app.use(express.static(path.join(__dirname, 'public')));

        // Add the standard Toto paths
        // Add the basic SMOKE api and /health endpoint. 
        this.path('GET', '/', new SmokeDelegate(), { noAuth: true, contentType: 'application/json', ignoreBasePath: true });
        this.path('GET', '/health', new SmokeDelegate(), { noAuth: true, contentType: 'application/json', ignoreBasePath: true });

        // Bindings
        this.staticContent = this.staticContent.bind(this);
        this.fileUploadPath = this.fileUploadPath.bind(this);
        this.path = this.path.bind(this);
    }

    /**
     * Registers a new PubSub implementation to be used in the Toto API Controller.
     * 
     * @param impl an implementation of APubSubImplementation
     */
    registerPubSubImplementation(impl: APubSubImplementation) {
        this.pubSubImplementationsFactory.registerImplementation(impl);
    }

    async init() {

        await this.config.load();

        this.validator = new Validator(this.config, this.logger, this.options.debugMode);

    }

    /**
     * This method will register the specified path to allow access to the static content in the specified folder
     * e.g. staticContent('/img', '/app/img')
     */
    staticContent(path: string, folder: string, options?: TotoPathOptions) {

        // If a basepath is defined, prepend it to the path
        // Make sure that the basePath does not end with "/". If it does remove it. 
        const correctedPath = (this.options.basePath && (!options || !options.ignoreBasePath)) ? this.options.basePath.replace(/\/$/, '').trim() + path : path;

        this.app.use(path, express.static(folder));

    }

    /**
     * 
     * @param {string} path the path to which this API is reachable
     * @param {function} delegate the delegate that will handle this call
     * @param {object} options options to configure this path: 
     *  - contentType: (OPT, default null) provide the Content-Type header to the response
     */
    streamGET(path: string, delegate: TotoDelegate, options?: TotoPathOptions) {

        // If a basepath is defined, prepend it to the path
        // Make sure that the basePath does not end with "/". If it does remove it. 
        const correctedPath = (this.options.basePath && (!options || !options.ignoreBasePath)) ? this.options.basePath.replace(/\/$/, '').trim() + path : path;

        this.app.route(correctedPath).get((req: Request, res: Response, next) => {

            this.validator.validate(req, options).then((userContext) => {

                this.logger.apiIn(req.headers['x-correlation-id'], 'GET', correctedPath);

                const executionContext = new ExecutionContext(this.logger, this.apiName, this.config, String(req.headers['x-correlation-id']), String(req.headers['x-app-version']))

                // Execute the GET
                delegate.do(req, userContext, executionContext).then((stream) => {

                    // Add any additional configured headers
                    if (options && options.contentType) res.header('Content-Type', options.contentType);

                    // stream must be a stream: e.g. var stream = bucket.file('Toast.jpg').createReadStream();
                    res.writeHead(200);

                    stream.on('data', (data: any) => {
                        res.write(data);
                    });

                    stream.on('end', () => {
                        res.end();
                    });
                }, (err) => {
                    // Log
                    this.logger.compute(req.headers['x-correlation-id'], err, 'error');
                    // If the err is a {code: 400, message: '...'}, then it's a validation error
                    if (err != null && err.code == '400') res.status(400).type('application/json').send(err);
                    // Failure
                    else res.status(500).type('application/json').send(err);
                });

            });
        });
    }

    /**
     * Adds a path that support uploading files
     *  - path:     the path as expected by express. E.g. '/upload'
     */
    fileUploadPath(path: string, delegate: TotoDelegate, options?: TotoPathOptions) {

        // If a basepath is defined, prepend it to the path
        // Make sure that the basePath does not end with "/". If it does remove it. 
        const correctedPath = (this.options.basePath && (!options || !options.ignoreBasePath)) ? this.options.basePath.replace(/\/$/, '').trim() + path : path;

        this.app.route(correctedPath).post(async (req, res, next) => {

            this.logger.apiIn(req.headers['x-correlation-id'], 'POST', correctedPath);

            // Validating
            const userContext = await this.validator.validate(req);

            let fstream;
            let filename: string;
            let filepath: string;
            let additionalData = {} as any;

            req.pipe(req.busboy);

            req.busboy.on('field', (fieldname, value, metadata) => {
                additionalData[fieldname] = value;
            });

            req.busboy.on('file', (fieldname, file, metadata) => {

                this.logger.compute(req.headers['x-correlation-id'], 'Uploading file ' + metadata.filename, 'info');

                // Define the target dir
                let dir = __dirname + '/app-docs';

                // Save the data 
                filename = metadata.filename;
                filepath = dir + '/' + metadata.filename

                // Ensure that the dir exists
                fs.ensureDirSync(dir);

                // Create the file stream
                fstream = fs.createWriteStream(dir + '/' + metadata.filename);

                // Pipe the file data to the stream
                file.pipe(fstream);

            });

            req.busboy.on("finish", () => {

                const executionContext = new ExecutionContext(this.logger, this.apiName, this.config, String(req.headers['x-correlation-id']), String(req.headers['x-app-version']))

                delegate.do({
                    query: req.query,
                    params: req.params,
                    headers: req.headers,
                    body: { filepath: filepath, filename: filename, ...additionalData }
                }, userContext, executionContext).then((data) => {
                    // Success
                    res.status(200).type('application/json').send(data);

                }, (err) => {
                    // Log
                    this.logger.compute(req.headers['x-correlation-id'], err, 'error');
                    // If the err is a {code: 400, message: '...'}, then it's a validation error
                    if (err != null && err.code == '400') res.status(400).type('application/json').send(err);
                    // Failure
                    else res.status(500).type('application/json').send(err);
                });
            })

        });

        // Log the added path
        console.log('[' + this.apiName + '] - Successfully added method ' + 'POST' + ' ' + correctedPath);
    }

    /**
     * Registers a PubSub event handler for the specified resource.
     * PubSub here is meant as the pattern not as the GCP offering. This should support any PubSub implementation (e.g. AWS SNS, Azure Service Bus, GCP PubSub, etc.)
     * 
     * @param resource the name of the resource that the handler will listen to. 
     * Resources are the REST resource that this handler will manage events on. 
     * For example: resource "payment" will manage all events related to the payment resource. E.g.: new payment, deleted payment, updated payment, etc.. 
     * IT IS NOT the name of the pubsub topic! 
     * 
     * @param handler the delegate that will handle the events for this resource
     */
    registerPubSubEventHandler(resource: string, handler: ITotoPubSubEventHandler, options?: TotoPathOptions) {

        const path = `/events/${resource}`;

        // If a basepath is defined, prepend it to the path
        // Make sure that the basePath does not end with "/". If it does remove it. 
        const correctedPath = (this.options.basePath && (!options || !options.ignoreBasePath)) ? this.options.basePath.replace(/\/$/, '').trim() + path : path;


        const handleRequest = async (req: Request, res: Response) => {

            const cid = req.get('x-correlation-id') || uuidv4();

            try {

                // Log the fact that a call has been received
                this.logger.compute(cid, `Received event on resource ${resource}`);

                // Find the right handler
                const pubSubImpl = this.pubSubImplementationsFactory.getPubSubImplementation(req);

                // Validating
                const isAuthorized = await pubSubImpl.getRequestValidator().isRequestAuthorized(req);

                if (!isAuthorized) throw new TotoRuntimeError(401, "Unauthorized PubSub request: " + JSON.stringify(req));

                // Build the context
                const executionContext = new ExecutionContext(this.logger, this.apiName, this.config, cid)

                // If the message is not destined to the handler (e.g. message that needs to be intercepted by a filter), then let the filter handle it
                const filter = pubSubImpl.filter(req);

                if (filter) {

                    return await filter.handle(req);
                    
                }

                // Convert the HTTP Request into a message
                const message = pubSubImpl.convertMessage(req);

                // Execute the GET
                const data = await handler.onEvent(message, executionContext);

                res.status(200).type('application/json').send(data);


            } catch (error) {

                this.logger.compute(cid, `${error}`, "error")

                if (error instanceof ValidationError || error instanceof TotoRuntimeError) {
                    res.status(error.code).type("application/json").send(error)
                }
                else {
                    console.log(error);
                    res.status(500).type('application/json').send(error);
                }
            }
        }

        // Register the route with the custom middleware
        this.app.post(correctedPath, parseTextAsJson, handleRequest);

        // Log the added path
        console.log('[' + this.apiName + '] - Successfully added event handler POST ' + correctedPath);

    }

    /**
     * Add a path to the app.
     * Requires:
     *  - method:   the HTTP method. Can be GET, POST, PUT, DELETE
     *  - path:     the path as expected by express. E.g. '/sessions/:id'
     *  - delegate: the delegate that exposes a do() function. Note that the delegate will always receive the entire req object
     *  - options:  optional options to path
     */
    path(method: string, path: string, delegate: TotoDelegate, options?: TotoPathOptions) {

        // If a basepath is defined, prepend it to the path
        // Make sure that the basePath does not end with "/". If it does remove it. 
        const correctedPath = (this.options.basePath && (!options || !options.ignoreBasePath)) ? this.options.basePath.replace(/\/$/, '').trim() + path : path;

        const handleRequest = async (req: Request, res: Response) => {

            const cid = String(req.headers['x-correlation-id']);

            try {

                // Log the fact that a call has been received
                this.logger.apiIn(cid, method, correctedPath);

                // Validating
                const userContext = await this.validator.validate(req, options);

                const executionContext = new ExecutionContext(this.logger, this.apiName, this.config, cid, String(req.headers['x-app-version']))

                // Execute the GET
                const data = await delegate.do(req, userContext, executionContext);

                let contentType = 'application/json'
                let dataToReturn = data;

                res.status(200).type(contentType).send(dataToReturn);


            } catch (error) {

                this.logger.compute(cid, `${error}`, "error")

                if (error instanceof ValidationError || error instanceof TotoRuntimeError) {
                    res.status(error.code).type("application/json").send(error)
                }
                else {
                    console.log(error);
                    res.status(500).type('application/json').send(error);
                }
            }
        }

        if (method == "GET") this.app.get(correctedPath, handleRequest);
        else if (method == "POST") this.app.post(correctedPath, handleRequest);
        else if (method == "PUT") this.app.put(correctedPath, handleRequest);
        else if (method == "DELETE") this.app.delete(correctedPath, handleRequest);
        else this.app.get(correctedPath, handleRequest);

        // Log the added path
        console.log('[' + this.apiName + '] - Successfully added method ' + method + ' ' + correctedPath);
    }

    /**
     * Starts the ExpressJS app by listening on the standard port defined for Toto microservices
     */
    listen() {

        if (!this.validator) {
            console.info("[" + this.apiName + "] - Waiting for the configuration to load...");
            setTimeout(() => { this.listen() }, 300);
            return;
        }

        this.app.listen(this.options.port, () => {
            this.logger.compute("", `[${this.apiName}] - Microservice listening on port ${this.options.port}`, 'info');
        });

    }
}


// Middleware to handle text/plain content type from e.g. AWS SNS
// AWS SNS sends SubscriptionConfirmation with text/plain but the body is actually JSON
const parseTextAsJson = (req: Request, res: Response, next: any) => {

    const contentType = req.get('content-type') || '';

    // If it's text/plain (e.g. AWS SNS does that), parse it as JSON
    if (contentType.includes('text/plain')) {

        bodyParser.text({ type: 'text/plain' })(req, res, (err) => {

            if (err) return next(err);

            try {
                // Parse the text body as JSON
                if (typeof req.body === 'string') {
                    req.body = JSON.parse(req.body);
                }
                next();
            } catch (parseError) {
                console.log(`Failed to parse SNS text/plain body as JSON: ${parseError}`, 'error');
                next(parseError);
            }
        });

    }
    else {
        // For other content types, continue normally (bodyParser.json() already handled it)
        next();
    }
};