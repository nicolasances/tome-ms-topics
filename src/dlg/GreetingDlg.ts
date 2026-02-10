import { Request } from "express";
import { FakeRequest, UserContext } from "../totoms";
import { TotoMCPDelegate } from "../totoms/mcp/TotoMCPDelegate";
import { TotoMCPToolDefinition } from "../totoms/mcp/TotoMCPToolDefinition";
import { ValidationError } from "totoms";
import { ToolResponse } from "../totoms/mcp/ToolResponse";
import z from "zod";

export class GreetingDelegate extends TotoMCPDelegate {

    public async processToolRequest(input: any): Promise<ToolResponse> {
        
        const name = input.name;

        if (!name) throw new ValidationError(400, "Name is required");

        return { content: [{ type: "text", text: `Hello, ${name}! This is MCP on Toto!` }] };
    }

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

    protected async do(req: Request | FakeRequest, userContext?: UserContext): Promise<any> {

        const name = req.body.name;

        if (!name) throw new ValidationError(400, "Name is required");

        return { content: [{ type: "text", text: `Hello, ${name}!` }] };
    }
}