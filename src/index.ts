import { TotoAPIController } from "./apicontroller/TotoAPIController";
import { ControllerConfig } from "./Config";
import { PostTopic } from "./dlg/PostTopic";
import { GetTopics } from "./dlg/GetTopics";
import { DeleteTopic } from "./dlg/DeleteTopic";
import { GetTopic } from "./dlg/GetTopic";
import { OnPracticeEvent } from "./evt/OnPracticeEvent";
import { OnTopicEvent } from "./evt/OnTopicEvent";
import { RefreshTopic } from "./dlg/RefreshTopic";

const api = new TotoAPIController(new ControllerConfig({apiName: "tome-ms-topics"}));

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