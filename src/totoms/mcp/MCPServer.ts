
import express from "express";
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Logger } from "..";
import { MCPServerConfiguration } from "../model/MCPConfiguration";
import { TotoMCPDelegate } from "./TotoMCPDelegate";

export class MCPServer {

    private mcpApp: express.Express;
    private server: McpServer;
    private config: MCPServerConfiguration;

    constructor(config: MCPServerConfiguration) {

        this.config = config;

        // MCP Server Setup - Stateless mode (each request gets fresh server/transport)
        this.mcpApp = express();

        this.server = new McpServer({
            name: config.name,
            version: "1.0.0",
        });

        // Register tools 
        if (this.config.tools) {

            const tools = this.config.tools.map(ToolClass => new ToolClass(undefined as any, undefined as any)); // Instantiate tools (messageBus and config can be passed if needed)

            this.registerTools(tools);
        }

        // Register the MCP route
        this.mcpApp.post('/mcp', express.json(), async (req, res) => {

            const logger = Logger.getInstance();

            try {

                logger.compute("[MCP Request]", "Received MCP Request on /mcp")

                // Stateless transport - no session management
                const transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: undefined, // Stateless mode
                });

                // Connect and handle request
                await this.server.connect(transport);

                await transport.handleRequest(req, res, req.body);

                // Clean up after request completes
                res.on('close', () => {
                    transport.close();
                });

            } catch (error) {

                logger.compute("[MCP Request]", "Error handling MCP Request on /mcp. Error: " + error)

                if (!res.headersSent) {

                    res.status(500).json({
                        jsonrpc: "2.0",
                        error: {
                            code: -32603,
                            message: "Internal error"
                        },
                        id: null
                    });
                }
            }
        });

    }

    /**
     * Registers tools in the configuration
     */
    private registerTools(tools: TotoMCPDelegate[]) {

        tools.forEach(tool => {

            const definition = tool.getToolDefinition();

            this.server.registerTool(definition.name, {
                title: definition.title,
                description: definition.description,
                inputSchema: definition.inputSchema,
            }, async (input) => {
                return await tool.processToolRequest(input) as any;
            });

        });
    }

    /**
     * Starts the MCP server and begins listening for requests. 
     * In this implementation, the server is stateless and creates a new transport for each incoming request.
     */
    public listen() {

        this.mcpApp.listen(this.config.port ?? 4001, () => {

            const logger = Logger.getInstance();

            logger.compute("INIT", `MCP Server listening on port ${this.config.port ?? 4001}`, 'info');
        });
    }
}