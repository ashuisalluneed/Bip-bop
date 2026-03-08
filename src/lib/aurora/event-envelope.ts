import { z } from "zod";
import { ulid } from "ulidx";
import { tickClock, type VectorClock } from "./vector-clock";

export const eventTypeSchema = z.enum([
  "message:send",
  "message:read",
  "message:delete",
  "conversation:typing"
]);

export const eventEnvelopeSchema = z.object({
  id: z.string(), // ULID
  type: eventTypeSchema,
  conversationId: z.string().min(1),
  senderId: z.string().min(1),
  timestamp: z.number().int().nonnegative(),
  vectorClock: z.record(z.string(), z.number().int().nonnegative()),
  payload: z.any(),
});

export type EventType = z.infer<typeof eventTypeSchema>;
export type EventEnvelope<T = any> = Omit<z.infer<typeof eventEnvelopeSchema>, 'payload'> & { payload: T };

export const parseEventEnvelope = (value: unknown) =>
  eventEnvelopeSchema.parse(value) as EventEnvelope;

/**
 * Event Factory
 * Creates a locally sequenced event envelope ready to be broadcast/persisted.
 */
export function createEvent<T>(
  type: EventType,
  payload: T,
  clock: VectorClock,
  senderId: string,
  conversationId: string
): EventEnvelope<T> {
  const updatedClock = tickClock(clock, senderId);

  return {
    id: ulid(),
    type,
    payload,
    vectorClock: updatedClock,
    timestamp: Date.now(),
    senderId,
    conversationId,
  };
}
