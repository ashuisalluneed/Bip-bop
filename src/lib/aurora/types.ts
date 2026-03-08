/**
 * Event Types and Envelope Schema for Aurora
 * 
 * In this architecture, we don't just "create a message" in a table.
 * Instead, we create a "message:send" EventEnvelope. The message state
 * is simply a projection of all events in the conversation log.
 */

// Global string-map for tracking causal event order across nodes
export type VectorClock = Record<string, number>;

// All allowed event types in the system
export type EventType =
    | "message:send"
    | "message:read"
    | "message:delete"
    // Future types (video likes, chat typing, etc)
    | "conversation:typing";

export interface EventEnvelope<T = any> {
    id: string;             // ULID — monotonic, sortable, globally unique ID
    type: EventType;        // Discriminant type
    payload: T;             // Event-specific data payload
    vectorClock: VectorClock; // The sender's clock state at time of event creation
    timestamp: number;      // Client-side JS timestamp (Unix epoch ms)
    senderId: string;       // User ID who created this event
    conversationId: string; // The primary partition/topic channel
}

// Payload specifically for a new chat message
export interface MessageSendPayload {
    messageId: string; // Unique ID for the message itself (UUID/CUID)
    content: string;
}

// Payload for acknowledging read receipts up to an event
export interface MessageReadPayload {
    lastReadEventId: string; // The highest ULID read by the user
}

// Payload for deleting a specific message
export interface MessageDeletePayload {
    messageId: string;
}
