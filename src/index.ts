import { ControllerConfig } from "./Config";
import { PostTopic } from "./dlg/PostTopic";
import { GetTopics } from "./dlg/GetTopics";
import { DeleteTopic } from "./dlg/DeleteTopic";
import { GetTopic } from "./dlg/GetTopic";
import { RefreshTopic } from "./dlg/RefreshTopic";
import { TotoAPIController } from "./totoapicontroller";
import { TotoMessageBus } from "./totoapicontroller/evt/MessageBus";
import { GCPPubSubImpl } from "./totoapicontroller/evt/impl/gcp/GCPPubSubImpl";
import { SNSImpl } from "./totoapicontroller/evt/impl/aws/SNSImpl";
import { OnFlashcardsCreated } from "./evt/handlers/OnFlashcardsCreated";
import { OnPracticeFinished } from "./evt/handlers/OnPracticeFinished";
import { OnTopicScraped } from "./evt/handlers/OnTopicScraped";

const config = new ControllerConfig({ apiName: "tome-ms-topics" }, { defaultHyperscaler: "aws", defaultSecretsManagerLocation: "aws" });
const api = new TotoAPIController(config, { basePath: '/tometopics' });

config.load().then(() => {
    const bus = new TotoMessageBus({ controller: api, messageBusImplementations: { gcp: new GCPPubSubImpl({ expectedAudience: config.getExpectedAudience() }), aws: new SNSImpl({ awsRegion: process.env.AWS_REGION || "eu-north-1" }) } });

    bus.registerMessageHandler(new OnTopicScraped());
    bus.registerMessageHandler(new OnPracticeFinished());
    bus.registerMessageHandler(new OnFlashcardsCreated());

    api.path('POST', '/topics', new PostTopic());
    api.path('GET', '/topics', new GetTopics());
    api.path('DELETE', '/topics/:id', new DeleteTopic());
    api.path('GET', '/topics/:topicId', new GetTopic());
    api.path('POST', '/topics/:topicId/refresh', new RefreshTopic());

    api.listen()
});