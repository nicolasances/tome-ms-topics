import { Request } from "express";
import { UserContext } from "../totoms";
import { TotoMCPDelegate } from "../totoms/mcp/TotoMCPDelegate";
import { TotoMCPToolDefinition } from "../totoms/mcp/TotoMCPToolDefinition";
import { ValidationError } from "totoms";
import z from "zod";

export class GreetingDelegate extends TotoMCPDelegate<GreetingRequest, GreetingResponse> {

    public getToolDefinition(): TotoMCPToolDefinition {

        return {
            name: "greetTool",
            title: "Greet user by name",
            description: "Greets a user by their name with a friendly hello message",
            inputSchema: z.object({
                name: z.string().describe("Name of the user to greet")
            }),
        };
    }


    protected async do(req: GreetingRequest, userContext?: UserContext): Promise<GreetingResponse> {

        const name = req.name;

        if (!name) throw new ValidationError(400, "Name is required");

        return { text: `Hello, ${name}! I think your email is ${userContext?.email ?? 'unknown'}` };
    }

    public parseRequest(req: Request): GreetingRequest {
        return { name: req.body.name }
    }
}

interface GreetingRequest {
    name: string;
}

interface GreetingResponse {
    text: string;
}