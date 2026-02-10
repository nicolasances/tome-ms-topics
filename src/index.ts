import { ControllerConfig } from "./Config";
import { PostTopic } from "./dlg/PostTopic";
import { GetTopics } from "./dlg/GetTopics";
import { DeleteTopic } from "./dlg/DeleteTopic";
import { GetTopic } from "./dlg/GetTopic";
import { RefreshTopic } from "./dlg/RefreshTopic";
import { OnFlashcardsCreated } from "./evt/handlers/OnFlashcardsCreated";
import { OnPracticeFinished } from "./evt/handlers/OnPracticeFinished";
import { OnTopicScraped } from "./evt/handlers/OnTopicScraped";
import { SupportedHyperscalers, TotoMicroservice, getHyperscalerConfiguration } from "./totoms"
import { PutTopic } from "./dlg/PutTopic";
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import z from "zod";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";


TotoMicroservice.init({
    serviceName: "tome-ms-topics",
    basePath: '/tometopics',
    port: 9000,
    environment: {
        hyperscaler: process.env.HYPERSCALER as SupportedHyperscalers || "aws",
        hyperscalerConfiguration: getHyperscalerConfiguration()
    },
    customConfiguration: ControllerConfig,
    apiConfiguration: {
        apiEndpoints: [
            // { method: 'POST', path: '/topics', delegate: PostTopic },
            // { method: 'GET', path: '/topics', delegate: GetTopics },
            // { method: 'DELETE', path: '/topics/:id', delegate: DeleteTopic },
            // { method: 'GET', path: '/topics/:topicId', delegate: GetTopic },
            // { method: 'PUT', path: '/topics/:topicId', delegate: PutTopic },
            // { method: 'POST', path: '/topics/:topicId/refresh', delegate: RefreshTopic }
        ],
        apiOptions: { noCorrelationId: true },
        openAPISpecification: { localSpecsFilePath: './openapi.yaml' }
    },
    // messageBusConfiguration: {
    //     topics: [
    //         { logicalName: "tometopics", secret: "tome_topics_topic_name" }
    //     ],
    //     messageHandlers: [
    //         OnTopicScraped,
    //         OnPracticeFinished,
    //         OnFlashcardsCreated
    //     ]
    // }
}).then((microservice: TotoMicroservice) => {
    microservice.start();
})

// MCP Server Setup - Stateless mode (each request gets fresh server/transport)
const mcpApp = express();

mcpApp.post('/mcp', express.json(), async (req, res) => {
    try {
        // Create fresh server and transport for each request (stateless)
        const server = new McpServer({
            name: "Greet Server",
            version: "1.0.0",
        });

        server.registerTool("greetTool", {
            title: "Greet user by name",
            description: "Greets a user by their name with a friendly hello message",
            inputSchema: z.object({
                name: z.string().describe("Name of the user to greet")
            }),
        }, async (input) => {
            return { content: [{ type: "text", text: `Hello, ${input.name}!` }] };
        });

        // Stateless transport - no session management
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined, // Stateless mode
        });

        // Connect and handle request
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);

        // Clean up after request completes
        res.on('close', () => {
            transport.close();
            server.close();
        });
    } catch (error) {
        console.error('[MCP Server] Error handling request:', error);
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

const PORT = 4100;
mcpApp.listen(PORT, () => {
    console.log(`MCP HTTP server running on port ${PORT}`);
});