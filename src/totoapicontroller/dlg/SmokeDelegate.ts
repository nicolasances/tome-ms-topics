import { Request } from "express";
import { ExecutionContext } from "../model/ExecutionContext";
import { TotoDelegate } from "../model/TotoDelegate";
import { UserContext } from "../model/UserContext";

export class SmokeDelegate extends TotoDelegate {

    async do(req: Request, userContext: UserContext | undefined, execContext: ExecutionContext): Promise<SmokeResponse> {

        return {
            api: execContext.apiName,
            status: "running"
        }

    }


}

export interface SmokeResponse {
    api: string,
    status: string
}
