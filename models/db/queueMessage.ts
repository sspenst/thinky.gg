import { ObjectId, Types } from 'mongoose';

export enum QueueMessageState {
    PENDING ='pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed'
}
// enum
export enum QueueMessageType {
    FETCH = 'FETCH',
    REFRESH_INDEX_CALCULATIONS = 'REFRESH_INDEX_CALCULATIONS',
    CALC_PLAY_ATTEMPTS = 'CALC_PLAY_ATTEMPTS',
}
export interface QueueMessage {
    _id: Types.ObjectId;
    dedupeKey?: string;
    type: QueueMessageType; // which queue it belongs to
    jobRunId: ObjectId; // which job run it belongs to
    priority: number; // higher priority is higher number
    message: string; // the message to send
    state: QueueMessageState;
    createdAt: Date; // when the message was created
    updatedAt: Date; // when the message was last updated
    processingStartedAt: Date;
    processingCompletedAt: Date; // when the message was completed
    processingAttempts: number; // how many times the message has been attempted
    log: string[]; // array of string for logging
}
