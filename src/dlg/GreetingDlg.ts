import { Request } from "express";
import { FakeRequest, UserContext } from "../totoms";
import { TotoMCPDelegate } from "../totoms/mcp/TotoMCPDelegate";
import { TotoMCPToolDefinition } from "../totoms/mcp/TotoMCPToolDefinition";
import { ValidationError } from "totoms";
import { ToolResponse } from "../totoms/mcp/ToolResponse";
import z from "zod";

export class GreetingDelegate extends TotoMCPDelegate {

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


    public async processToolRequest(input: any, userContext?: UserContext): Promise<ToolResponse> {
        
        const name = input.name;

        if (!name) throw new ValidationError(400, "Name is required");

        return { content: [{ type: "text", text: `Hello, ${name}! Your email is ${userContext?.email ?? 'unknown'}` }] };
    }

    protected async do(req: Request | FakeRequest, userContext?: UserContext): Promise<any> {

        const name = req.body.name;

        if (!name) throw new ValidationError(400, "Name is required");

        return { content: [{ type: "text", text: `Hello, ${name}!` }] };
    }
}