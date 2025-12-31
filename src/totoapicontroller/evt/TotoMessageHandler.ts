import { TotoControllerConfig } from "../model/TotoControllerConfig";
import { TotoMessage } from "./TotoMessage";
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface for handling incoming Toto Messages.
 * All Handlers must implement this interface.
 */
export abstract class TotoMessageHandler {

    cid?: string;

    constructor(protected config: TotoControllerConfig) { }

    /**
     * Wrapper of the onMessage() method that provides specific pre-processing if needed.
     * @param msg the message to process
     * @returns 
     */
    public async processMessage(msg: TotoMessage): Promise<ProcessingResponse> {

        this.cid = msg.cid || uuidv4();

        return this.onMessage(msg);
    }

    /**
     * The type of event handled by this handler.
     * 
     * By design, each handler handles a single event type.
     */
    protected abstract handledMessageType: string;

    /**
     * Gets the type of event handled by this handler.
     */
    getHandledMessageType(): string {
        return this.handledMessageType;
    }

    /**
     * Processes an incoming message.
     * 
     * @param msg the message to process
     */
    protected abstract onMessage(msg: TotoMessage): Promise<ProcessingResponse>;

}

export interface ProcessingResponse {
    status: "processed" | "ignored" | "failed";
    responsePayload?: any;
}