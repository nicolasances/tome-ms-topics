import { Request } from "express";
import { APubSubImplementation, APubSubRequestValidator } from "../../PubSubImplementation";
import { TotoMessage } from "../../TotoMessage";
import { SNSRequestValidator } from "./SNSRequestValidator";
import { ValidationError } from "../../../TotoAPIController";

export class SNSImpl extends APubSubImplementation {

    getRequestValidator(): APubSubRequestValidator {
        return new SNSRequestValidator(this.config, this.logger);
    }

    convertMessage(req: Request): TotoMessage {

        const message = req.body;

        if (message.Type == 'SubscriptionConfirmation' || message.Type == 'UnsubscribeConfirmation') return {type: message.Type, data: message};

        if (message.Type == 'Notification') {

            // The message is in the "Message" field
            try {
                const payload = JSON.parse(message.Message);

                return {
                    type: payload.type, 
                    data: payload.data
                }

            } catch (error) {

                // If the error is a parsing error
                if (error instanceof SyntaxError) {

                    this.logger.compute('', `SNS message is not a valid JSON: ${message.Message}`);

                    console.log(error)
                    
                    throw new ValidationError(400, 'SNS message is not a valid JSON');
                    
                }

                throw error;
                
            }
        }

        throw new ValidationError(400, `Unsupported SNS message type: ${message.Type}`);

    }
}