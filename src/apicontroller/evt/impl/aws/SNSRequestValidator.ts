import { Request } from "express";
import * as crypto from 'crypto';
import * as https from 'https';
import { APubSubRequestValidator } from "../../PubSubImplementation";

export class SNSRequestValidator extends APubSubRequestValidator {

    isRequestRecognized(req: Request): boolean {

        const message = req.body;

        if (!message || !message.Type || !message.Signature || !message.SigningCertURL) return false;

        return this.isValidCertUrl(message.SigningCertURL);

    }

    async isRequestAuthorized(req: Request): Promise<boolean> {

        try {
            const message = req.body;

            // 1. Verify message has required fields
            if (!message || !message.Type || !message.Signature || !message.SigningCertURL) {
                this.logger.compute('', 'SNS message missing required fields');
                return false;
            }

            console.log(message);


            // 2. Verify the certificate URL is from AWS
            // if (!this.isValidCertUrl(message.SigningCertURL)) {
            //     this.logger.compute('', 'Invalid SNS certificate URL');
            //     return false;
            // }

            // // 3. Download and verify the signing certificate
            // const certificate = await this.downloadCertificate(message.SigningCertURL);
            // if (!certificate) {
            //     this.logger.compute('', 'Failed to download SNS certificate');
            //     return false;
            // }

            // // 4. Build the string to sign based on message type
            // const stringToSign = this.buildStringToSign(message);

            // if (!stringToSign) {
            //     this.logger.compute('', 'Invalid SNS message type');
            //     return false;
            // }

            // // 5. Verify the signature
            // const isValid = this.verifySignature(certificate, stringToSign, message.Signature);
            // if (!isValid) {
            //     this.logger.compute('', 'SNS signature verification failed');
            //     return false;
            // }

            // 6. Optional: Verify topic ARN if you want to restrict to specific topics
            // const expectedTopicArn = process.env.SNS_TOPIC_ARN;
            // if (expectedTopicArn && message.TopicArn !== expectedTopicArn) {
            //     console.error('SNS message from unexpected topic');
            //     return false;
            // }

            this.logger.compute('', `SNS message validated successfully. Type: ${message.Type}`);

            return true;

        } catch (error) {
            console.error('SNS request validation error:', error);
            return false;
        }
    }

    /**
     * Verify the certificate URL is from AWS
     */
    private isValidCertUrl(certUrl: string): boolean {

        try {

            const url = new URL(certUrl);

            // Must be HTTPS and from amazonaws.com
            return url.protocol === 'https:' && (url.hostname.endsWith('.amazonaws.com') || url.hostname === 'sns.amazonaws.com');

        } catch {
            return false;
        }
    }

    /**
     * Download the certificate from AWS
     */
    private async downloadCertificate(certUrl: string): Promise<string | null> {

        return new Promise((resolve) => {

            https.get(certUrl, (res) => {

                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(data));

            }).on('error', (err) => {
                console.error('Certificate download error:', err);
                resolve(null);
            });
        });
    }

    /**
     * Build the string to sign based on SNS message type
     */
    private buildStringToSign(message: any): string | null {

        const fields: { [key: string]: string[] } = {
            'Notification': ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type'],
            'SubscriptionConfirmation': ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'],
            'UnsubscribeConfirmation': ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type']
        };

        const messageType = message.Type;
        const fieldList = fields[messageType];

        if (!fieldList) {
            return null;
        }

        let stringToSign = '';
        for (const field of fieldList) {
            if (message[field] !== undefined) {
                stringToSign += `${field}\n${message[field]}\n`;
            }
        }

        return stringToSign;
    }

    /**
     * Verify the signature using the certificate
     */
    private verifySignature(certificate: string, stringToSign: string, signature: string): boolean {
        try {

            const verifier = crypto.createVerify('SHA1');

            verifier.update(stringToSign, 'utf8');

            // Pass signature as base64 string and specify encoding
            return verifier.verify(certificate, signature, 'base64');

        } catch (error) {
            console.error('Signature verification error:', error);
            return false;
        }
    }
}