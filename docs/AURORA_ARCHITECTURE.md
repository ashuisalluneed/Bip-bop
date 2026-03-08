# Aurora Architecture Blueprint (Phase 0)

This document captures the initial architecture direction for evolving BipBop into **Aurora**:
a resilient, privacy-first, real-time communication platform combining chat communities and short-form media.

## Design Tenets

1. **Internet optional**: product remains useful in offline/local-network conditions.
2. **Event first**: every state transition is represented by immutable events.
3. **Privacy by default**: messages are encrypted before transport.
4. **Deterministic sync**: conflicting offline edits reconcile via vector clocks + timestamp tie-break.
5. **Composable services**: each capability is independently deployable and testable.

## Runtime and Platform

- **Frontend runtime**: Bun + Next.js (App Router)
- **Backend runtime**: Bun services
- **Data**: Supabase (PostgreSQL + Realtime + RLS)
- **Event backbone**: Kafka
- **Realtime transport**: WebSocket gateway + WebRTC for media/peer mode

## Service Topology (Target)

- API Gateway (REST + auth/session bootstrap)
- Realtime Gateway (WebSocket)
- Message Router
- Presence Service
- Media Service
- Key Management Service
- Moderation Service
- Sync/Reconciliation Service

## Data & Sync Strategy

- Message log is append-only and event-sourced.
- Clients keep an encrypted local event cache in IndexedDB.
- On reconnect:
  1. client uploads unsynced events,
  2. server reconciles with vector clocks,
  3. deterministic winner is selected,
  4. merged state is broadcast.

## Phase Plan

### Phase 0 (this repository state)

- Introduce core domain contracts for offline reconciliation:
  - event envelope schema
  - vector clock utilities
  - deterministic reconciliation primitive
- Add tests for conflict behavior and causality comparisons.

### Phase 1

- Introduce WebSocket gateway abstraction with pluggable adapters.
- Implement conversation and channel domain modules.
- Add audit log event stream.

### Phase 2

- Add local-peer mode over WebRTC data channels.
- Add optimistic UI + local event queue persistence.
- Add replay/sync endpoint for reconnect workflows.

### Phase 3

- Introduce E2EE key rotation per conversation.
- Add safe-state mode controls and automated incident policy.
- Add horizontal sharding for high-throughput fan-out.

## Immediate Next Tasks

1. Wire these Aurora domain utilities into `message` router mutation flow.
2. Add a durable `MessageEvent` table in Prisma for event envelopes.
3. Add integration tests for reconnect + conflict reconciliation.
4. Add benchmark harness for high-concurrency fan-out scenarios.
