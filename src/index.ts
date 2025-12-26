import { ControllerConfig } from "./Config";
import { PostTopic } from "./dlg/PostTopic";
import { GetTopics } from "./dlg/GetTopics";
import { DeleteTopic } from "./dlg/DeleteTopic";
import { GetTopic } from "./dlg/GetTopic";
import { OnPracticeEvent } from "./evt/OnPracticeEvent";
import { OnTopicEvent } from "./evt/OnTopicEvent";
import { RefreshTopic } from "./dlg/RefreshTopic";
import { TotoAPIController } from "./totoapicontroller";

const config = new ControllerConfig({apiName: "tome-ms-topics"}, {defaultHyperscaler: "aws", defaultSecretsManagerLocation: "aws"});
const api = new TotoAPIController(config, {basePath: '/tometopics'});

api.path('POST', '/topics', new PostTopic());
api.path('GET', '/topics', new GetTopics());
api.path('DELETE', '/topics/:id', new DeleteTopic());
api.path('GET', '/topics/:topicId', new GetTopic());
api.path('POST', '/topics/:topicId/refresh', new RefreshTopic()); 

api.registerPubSubEventHandler('topic', new OnTopicEvent());
api.registerPubSubEventHandler('practice', new OnPracticeEvent());

api.init().then(() => {
    api.listen()
});