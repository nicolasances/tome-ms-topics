import { Request } from "express";
import { Logger, TotoControllerConfig, TotoRuntimeError } from "../TotoAPIController";
import { APubSubImplementation } from "./PubSubImplementation";

/**
 * 
 */
export class PubSubImplementationsFactory {

    private registeredImplementations: APubSubImplementation[];

    constructor(protected config: TotoControllerConfig, protected logger: Logger) {

        this.registeredImplementations = []
    }

    /**
     * Registers a new PubSub implementation to be used in the Toto API Controller.
     * 
     * @param impl an implementation of the APubSubImplementation interface
     */
    registerImplementation(impl: APubSubImplementation) {
        this.registeredImplementations.push(impl);
    }

    getPubSubImplementation(req: Request): APubSubImplementation {

        console.log("*******************************************************");
        console.log(req.body)
        console.log("*******************************************************");
        console.log(req)

        const implementations = this.registeredImplementations.filter(impl => impl.getRequestValidator().isRequestRecognized(req));

        if (implementations.length == 0) throw new TotoRuntimeError(500, `No PubSub implementation found for the received request. Request body: ${JSON.stringify(req.body)}`);

        return implementations[0];
    }
}

