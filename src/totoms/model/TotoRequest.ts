import { Request } from "express";

/**
 * Base class for all Toto requests.
 * 
 * Subclasses should implement a static `fromExpress` method to create instances from Express Request objects:
 * 
 * @example
 * ```typescript
 * class MyRequest extends TotoRequest {
 *     myField: string;
 * 
 *     static fromExpress(req: Request): MyRequest {
 *         const instance = new MyRequest();
 *         instance.myField = req.body.myField;
 *         // Add validation logic here
 *         if (!instance.myField) {
 *             throw new ValidationError("myField is required");
 *         }
 *         return instance;
 *     }
 * }
 * ```
 */
export abstract class TotoRequest {

    /**
     * Factory method to create a TotoRequest instance from an Express Request.
     * Subclasses should override this to parse and validate the Express request.
     * 
     * @param req - Express Request object
     * @returns Instance of the TotoRequest subclass
     */
    static fromExpress(req: Request): TotoRequest {
        throw new Error("fromExpress() must be implemented by subclass");
    }

}

/**
 * Type helper to ensure a TotoRequest subclass has a proper fromExpress method.
 * 
 * @example
 * ```typescript
 * const MyRequestConstructor: TotoRequestConstructor<MyRequest> = MyRequest;
 * const instance = MyRequestConstructor.fromExpress(expressReq);
 * ```
 */
export interface TotoRequestConstructor<T extends TotoRequest> {
    new(): T;
    fromExpress(req: Request): T;
}