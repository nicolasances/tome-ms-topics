import { TotoAPIController } from "toto-api-controller";
import { ControllerConfig } from "./Config";
import { PostTopic } from "./dlg/PostTopic";
import { GetTopics } from "./dlg/GetTopics";
import { DeleteTopic } from "./dlg/DeleteTopic";

const api = new TotoAPIController("tome-ms-topics", new ControllerConfig())

api.path('POST', '/topics', new PostTopic());
api.path('GET', '/topics', new GetTopics());
api.path('DELETE', '/topics/:id', new DeleteTopic());

api.init().then(() => {
    api.listen()
});