import { Request } from "express";
import { TotoDelegate } from "../model/TotoDelegate";
import { UserContext } from "../model/UserContext";
import { TotoRequest } from "../model/TotoRequest";

export class SmokeDelegate extends TotoDelegate<SmokeRequest, SmokeResponse> {

    apiName?: string;   // Injected

    async do(req: SmokeRequest, userContext: UserContext | undefined): Promise<SmokeResponse> {

        return {
            api: this.apiName,
            status: "running"
        }

    }


}

class SmokeRequest extends TotoRequest {

    /**
     * Creates a SmokeRequest from an Express Request.
     * SmokeRequest has no specific fields, so just returns a new instance.
     */
    static fromExpress(req: Request): SmokeRequest {
        return new SmokeRequest();
    }

}

export interface SmokeResponse {
    api?: string,
    status: string
}
