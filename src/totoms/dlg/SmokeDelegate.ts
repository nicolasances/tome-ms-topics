import { Request } from "express";
import { TotoDelegate } from "../model/TotoDelegate";
import { UserContext } from "../model/UserContext";

export class SmokeDelegate extends TotoDelegate {

    apiName?: string;   // Injected

    async do(req: Request, userContext: UserContext | undefined): Promise<SmokeResponse> {

        return {
            api: this.apiName,
            status: "running"
        }

    }


}

export interface SmokeResponse {
    api?: string,
    status: string
}
