import { ControllerConfig } from "./Config";
import { PostTopic } from "./dlg/PostTopic";
import { GetTopics } from "./dlg/GetTopics";
import { DeleteTopic } from "./dlg/DeleteTopic";
import { GetTopic } from "./dlg/GetTopic";
import { RefreshTopic } from "./dlg/RefreshTopic";
import { OnFlashcardsCreated } from "./evt/handlers/OnFlashcardsCreated";
import { OnPracticeFinished } from "./evt/handlers/OnPracticeFinished";
import { OnTopicScraped } from "./evt/handlers/OnTopicScraped";
import { TotoMicroservice } from "./totoapicontroller/TotoMicroservice";

TotoMicroservice.init({
    config: new ControllerConfig({ apiName: "tome-ms-topics" }, { defaultHyperscaler: "aws", defaultSecretsManagerLocation: "aws" }),
    basePath: '/tometopics',
    apiEndpoints: [
        { method: 'POST', path: '/topics', delegate: PostTopic },
        { method: 'GET', path: '/topics', delegate: GetTopics },
        { method: 'DELETE', path: '/topics/:id', delegate: DeleteTopic },
        { method: 'GET', path: '/topics/:topicId', delegate: GetTopic },
        { method: 'POST', path: '/topics/:topicId/refresh', delegate: RefreshTopic }
    ],
    messageHandlers: [
        new OnTopicScraped(),
        new OnPracticeFinished(),
        new OnFlashcardsCreated()
    ]
}).then(ms => {
    ms.start();
})
