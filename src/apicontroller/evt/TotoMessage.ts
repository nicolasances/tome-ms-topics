
export interface TotoMessage {

    type: string;   // Event type (identifier of the event that can be used to route the message)
    data: any;      // Event data (payload)
}
