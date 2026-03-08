import { z } from "zod";

export const deliveryStateSchema = z.enum([
  "pending",
  "sent",
  "delivered",
  "read",
  "failed",
]);

export const eventEnvelopeSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().min(1),
  senderId: z.string().min(1),
  createdAt: z.number().int().nonnegative(),
  vectorClock: z.record(z.string(), z.number().int().nonnegative()),
  payload: z.object({
    body: z.string().min(1),
    mentions: z.array(z.string().min(1)).default([]),
    replyToEventId: z.string().uuid().optional(),
  }),
  deliveryState: deliveryStateSchema,
  encrypted: z.boolean(),
});

export type DeliveryState = z.infer<typeof deliveryStateSchema>;
export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;

export const parseEventEnvelope = (value: unknown): EventEnvelope =>
  eventEnvelopeSchema.parse(value);
