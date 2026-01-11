import { ControllerConfig } from "./Config";
import { PostTopic } from "./dlg/PostTopic";
import { GetTopics } from "./dlg/GetTopics";
import { DeleteTopic } from "./dlg/DeleteTopic";
import { GetTopic } from "./dlg/GetTopic";
import { RefreshTopic } from "./dlg/RefreshTopic";
import { OnFlashcardsCreated } from "./evt/handlers/OnFlashcardsCreated";
import { OnPracticeFinished } from "./evt/handlers/OnPracticeFinished";
import { OnTopicScraped } from "./evt/handlers/OnTopicScraped";
import { SupportedHyperscalers, TotoMicroservice, getHyperscalerConfiguration } from "totoms";
import { PutTopic } from "./dlg/PutTopic";

TotoMicroservice.init({
    serviceName: "tome-ms-topics",
    basePath: '/tometopics',
    environment: {
        hyperscaler: process.env.HYPERSCALER as SupportedHyperscalers || "aws",
        hyperscalerConfiguration: getHyperscalerConfiguration()
    },
    customConfiguration: ControllerConfig,
    apiConfiguration: {
        apiEndpoints: [
            { method: 'POST', path: '/topics', delegate: PostTopic },
            { method: 'GET', path: '/topics', delegate: GetTopics },
            { method: 'DELETE', path: '/topics/:id', delegate: DeleteTopic },
            { method: 'GET', path: '/topics/:topicId', delegate: GetTopic },
            { method: 'PUT', path: '/topics/:topicId', delegate: PutTopic },
            { method: 'POST', path: '/topics/:topicId/refresh', delegate: RefreshTopic }
        ],
        apiOptions: { noCorrelationId: true }
    }, 
    messageBusConfiguration: {
        topics: [
            { logicalName: "tometopics", secret: "tome_topics_topic_name" }
        ],
        messageHandlers: [
            OnTopicScraped,
            OnPracticeFinished,
            OnFlashcardsCreated
        ]
    }
}).then(microservice => {
    microservice.start();
})
