import { Request } from "express";
import { APubSubImplementation, APubSubRequestFilter, APubSubRequestValidator } from "../../PubSubImplementation";
import { GCPPubSubRequestValidator } from "./GCPPubSubRequestValidator";
import { TotoMessage } from "../../TotoMessage";


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