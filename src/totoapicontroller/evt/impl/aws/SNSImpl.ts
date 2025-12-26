import { Request } from "express";
import { APubSubImplementation, APubSubRequestFilter, APubSubRequestValidator } from "../../PubSubImplementation";
import { TotoMessage } from "../../TotoMessage";
import { SNSRequestValidator } from "./SNSRequestValidator";
import { Logger, ValidationError } from "../../..";
import https from "https";
import moment from "moment-timezone";

export class SNSImpl extends APubSubImplementation {

    getRequestValidator(): APubSubRequestValidator {
        return new SNSRequestValidator(this.config, this.logger);
    }


    filter(req: Request): APubSubRequestFilter | null {

        if (req.get('x-amz-sns-message-type') == 'SubscriptionConfirmation') return new SNSSubscriptionConfirmationFilter(this.logger);

        return null;
    }

    convertMessage(req: Request): TotoMessage {

        if (req.get('x-amz-sns-message-type') == 'SubscriptionConfirmation' || req.get('x-amz-sns-message-type') == 'UnsubscribeConfirmation') {

            this.logger.compute('', `Confirming SNS subscription/unsubscription message.`);

            return {
                timestamp: moment().tz('Europe/Rome').format("YYYY.MM.DD HH:mm:ss"),
                cid: '',
                id: '',
                type: req.get('x-amz-sns-message-type')!,
                msg: '',
                data: req.body
            }
        }

        const message = req.body;

        if (message.Type == 'SubscriptionConfirmation' || message.Type == 'UnsubscribeConfirmation') return {
            timestamp: moment().tz('Europe/Rome').format("YYYY.MM.DD HH:mm:ss"),
            cid: '',
            id: '',
            type: message.Type,
            msg: '',
            data: message
        };

        if (message.Type == 'Notification') {

            // The message is in the "Message" field
            try {
                const payload = JSON.parse(message.Message);

                return {
                    timestamp: payload.timestamp,
                    cid: payload.cid,
                    id: payload.id,
                    type: payload.type,
                    msg: payload.msg,
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

class SNSSubscriptionConfirmationFilter implements APubSubRequestFilter {

    constructor(private logger: Logger) { }

    async handle(req: Request): Promise<void> {

        // Confirm the subscription by calling the SubscribeURL
        const message = req.body;

        const subscribeUrl = message.SubscribeURL;

        this.logger.compute('', `Confirming SNS subscription: ${subscribeUrl}`);

        https.get(subscribeUrl, {}, (response) => {

            if (response.statusCode === 200) {
                this.logger.compute('', `SNS subscription confirmed successfully.`);
            }
            else {
                this.logger.compute('', `Failed to confirm SNS subscription. Status: ${response.statusCode}`);
            }

        }).on('error', (err) => {
            this.logger.compute('', `Error confirming SNS subscription: ${err.message}`);
        });
    }
}