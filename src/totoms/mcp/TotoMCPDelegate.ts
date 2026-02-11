import { TotoDelegate } from "../model/TotoDelegate";
import { UserContext } from "../model/UserContext";
import { ToolResponse } from "./ToolResponse";
import { TotoMCPToolDefinition } from "./TotoMCPToolDefinition";

export abstract class TotoMCPDelegate extends TotoDelegate {

    /**
     * Processes the incoming tool request and returns a Promise with the result.
     * 
     * @param input the input for the tool, validated against the tool's input schema
     */
    public abstract processToolRequest(input: any, userContext: UserContext): Promise<ToolResponse>;

    /**
     * Returns the definition of the tool, including its name, title, description, and input schema.
     */
    public abstract getToolDefinition(): TotoMCPToolDefinition;
}