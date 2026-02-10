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
    // },
    mcpConfiguration: {
        enableMCP: true,
        serverConfiguration: {
            name: "Tome Topics MCP Server",
            port: 4100,
            tools: [
                {
                    name: "greetTool",
                    title: "Greet user by name",
                    description: "Greets a user by their name with a friendly hello message",
                    inputSchema: z.object({ name: z.string().describe("Name of the user to greet") }),
                    delegate: async (input) => {
                        return { content: [{ type: "text", text: `Hello, ${input.name}! You're using MCP!` }] };
                    }
                }
            ]
        }
    }
}).then((microservice: TotoMicroservice) => {
    microservice.start();
})
