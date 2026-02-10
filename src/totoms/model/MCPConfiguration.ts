export interface MCPConfiguration {
    enableMCP: boolean;
    serverConfiguration: MCPServerConfiguration;
}

export interface MCPServerConfiguration {
    name: string;   // Name of the MCP server instance
    port: number;   // Port to listen on
}