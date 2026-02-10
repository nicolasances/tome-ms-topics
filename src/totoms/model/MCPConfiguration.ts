import z from "zod";

export interface MCPConfiguration {
    enableMCP: boolean;
    serverConfiguration: MCPServerConfiguration;
}

export interface ToolsConfiguration {
    tools: ToolConfiguration[];
}

export interface ToolConfiguration {
    name: string; 
    title: string; 
    description: string;   
    inputSchema: z.ZodObject<any>;
    delegate: (input: any) => Promise<any>;
}

export interface MCPServerConfiguration {
    name: string;   // Name of the MCP server instance
    port: number;   // Port to listen on
    tools?: ToolConfiguration[]; // Optional list of tools to register on the server
}   