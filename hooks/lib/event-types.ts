/**
 * event-types.ts — Typed event definitions for the Unified Event System
 *
 * 13 event categories covering all PAI hook observability.
 * Discriminated union on `type` field for type-safe consumption.
 *
 * See: PAI/THEHOOKSYSTEM.md § Unified Event System
 */

// ── Base ──

export interface BaseEvent {
  timestamp: string;    // ISO 8601, auto-injected by appendEvent()
  session_id: string;   // auto-injected from CLAUDE_SESSION_ID
  source: string;       // hook or handler name
  type: string;         // dot-separated topic
}

// ── Algorithm Events ──

export interface AlgorithmPhaseEvent extends BaseEvent {
  type: 'algorithm.phase';
  phase: string;
  slug?: string;
  progress?: string;
}

// ── Work Events ──

export interface WorkCreatedEvent extends BaseEvent {
  type: 'work.created';
  slug: string;
  task?: string;
}

export interface WorkCompletedEvent extends BaseEvent {
  type: 'work.completed';
  slug: string;
  duration_minutes?: number;
}

// ── Session Events ──

export interface SessionNamedEvent extends BaseEvent {
  type: 'session.named';
  name: string;
}

export interface SessionCompletedEvent extends BaseEvent {
  type: 'session.completed';
  work_slug?: string;
}

// ── Rating Events ──

export interface RatingCapturedEvent extends BaseEvent {
  type: 'rating.captured';
  rating: number;
  rating_source: 'explicit' | 'implicit';
  confidence?: number;
  summary?: string;
}

// ── Learning Events ──

export interface LearningCapturedEvent extends BaseEvent {
  type: 'learning.captured';
  category: string;
  slug?: string;
  file_path?: string;
}

// ── Voice Events ──

export interface VoiceSentEvent extends BaseEvent {
  type: 'voice.sent';
  character_count: number;
  voice_id?: string;
}

export interface VoiceFailedEvent extends BaseEvent {
  type: 'voice.failed';
  error: string;
}

// ── PRD Events ──

export interface PrdSyncedEvent extends BaseEvent {
  type: 'prd.synced';
  slug: string;
  phase?: string;
  progress?: string;
}

// ── Doc Events ──

export interface DocIntegrityEvent extends BaseEvent {
  type: 'doc.integrity';
  status: 'pass' | 'fail';
  details?: string;
}

// ── Build Events ──

export interface BuildRebuildEvent extends BaseEvent {
  type: 'build.rebuild';
  target: string;
  duration_ms?: number;
}

// ── System Events ──

export interface SystemIntegrityEvent extends BaseEvent {
  type: 'system.integrity';
  status: 'pass' | 'fail';
  checks?: Record<string, boolean>;
}

// ── Settings Events ──

export interface SettingsCountsUpdatedEvent extends BaseEvent {
  type: 'settings.counts_updated';
  counts?: Record<string, number>;
}

// ── Tab Events ──

export interface TabUpdatedEvent extends BaseEvent {
  type: 'tab.updated';
  title?: string;
  state?: string;
}

// ── Hook Error Events ──

export interface HookErrorEvent extends BaseEvent {
  type: 'hook.error';
  hook_name: string;
  error: string;
}

// ── Custom Events ──

export interface CustomEvent extends BaseEvent {
  type: `custom.${string}`;
  [key: string]: unknown;
}

// ── Discriminated Union ──

export type PAIEvent =
  | AlgorithmPhaseEvent
  | WorkCreatedEvent
  | WorkCompletedEvent
  | SessionNamedEvent
  | SessionCompletedEvent
  | RatingCapturedEvent
  | LearningCapturedEvent
  | VoiceSentEvent
  | VoiceFailedEvent
  | PrdSyncedEvent
  | DocIntegrityEvent
  | BuildRebuildEvent
  | SystemIntegrityEvent
  | SettingsCountsUpdatedEvent
  | TabUpdatedEvent
  | HookErrorEvent
  | CustomEvent;

// ── Input type for appendEvent (without auto-injected fields) ──

export type EventInput = Omit<PAIEvent, 'timestamp' | 'session_id'>;
