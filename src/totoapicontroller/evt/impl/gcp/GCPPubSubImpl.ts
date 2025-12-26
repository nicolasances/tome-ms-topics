import { Request } from "express";
import { APubSubImplementation, APubSubRequestFilter, APubSubRequestValidator } from "../../PubSubImplementation";
import { TotoMessage } from "../../TotoMessage";
import { ValidationError } from "../../../validation/Validator";
import { googleAuthCheck } from "../../..";


export class GCPPubSubImpl extends APubSubImplementation {
    
    filter(req: Request): APubSubRequestFilter | null {
        return null;
    }

    getRequestValidator(): APubSubRequestValidator {
        return new GCPPubSubRequestValidator(this.config, this.logger);
    }

    convertMessage(req: Request): TotoMessage {

        let msg = JSON.parse(String(Buffer.from(req.body.message.data, 'base64')))

        return {
            timestamp: msg.timestamp,
            cid: msg.cid,
            id: msg.id,
            type: msg.type,
            msg: msg.msg,
            data: msg.data
        }
    }

}
/**
 * Validator for HTTP Requests made by Google Cloud PubSub push infrastructure.
 * 
 * Implementation notes:
 * - GCP PubSub supports adding HTTP Headers (e.g. Authorization). Therefore, this validator can validate the request based on JWT tokens.
 */
export class GCPPubSubRequestValidator extends APubSubRequestValidator {

    isRequestRecognized(req: Request): boolean {

        // Check if the request body has the typical GCP PubSub message structure
            if (!req.body || typeof req.body !== 'object') {
                return false;
            }

            // GCP PubSub push messages have a 'message' field and a 'subscription' field
            const hasMessage = 'message' in req.body && typeof req.body.message === 'object';

            if (!hasMessage) {
                return false;
            }

            // The message object should contain 'data' and 'messageId' fields
            const message = req.body.message;
            const hasData = 'data' in message;

            return hasData; 
    }

    async isRequestAuthorized(req: Request): Promise<boolean> {

        // Extraction of the headers
        const authorizationHeader = req.get('authorization');

        if (!authorizationHeader) throw new ValidationError(401, "No Authorization Header provided")

        const expectedAudience = this.config.getExpectedAudience(); 

        const googleAuthCheckResult = await googleAuthCheck("", authorizationHeader, expectedAudience, this.logger, false);

        if (googleAuthCheckResult.email) return true; 

        return false;

    }

}