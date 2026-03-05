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

// ── Agent Events ──

export interface AgentStartEvent extends BaseEvent {
  type: 'agent.start';
  agent_type?: string;
  agent_id?: string;
  description?: string;
}

export interface AgentStopEvent extends BaseEvent {
  type: 'agent.stop';
  agent_id?: string;
  transcript_path?: string;
  duration_ms?: number;
  last_message_preview?: string;
}

// ── Task Events ──

export interface TaskCompletedEvent extends BaseEvent {
  type: 'task.completed';
  task_id?: string;
  task_subject?: string;
}

// ── Merge Events ──

export interface MergeOkEvent extends BaseEvent {
  type: 'merge.ok';
  pr_number: number;
  branch: string;
  title: string;
  repo?: string;
}

export interface MergeFailEvent extends BaseEvent {
  type: 'merge.fail';
  pr_number: number;
  reason: string;
  branch: string;
  repo?: string;
}

export interface PrTestedEvent extends BaseEvent {
  type: 'pr.tested';
  pr_number: number;
  result: 'pass' | 'fail';
  branch: string;
  duration_ms?: number;
  repo?: string;
}

// ── A0 Health Check Events ──

export interface A0HealthCheckEvent extends BaseEvent {
  type: 'a0.health_check';
  all_healthy: boolean;
  services_up: number;
  services_down: number;
  failures?: string[];
}

// ── AutoMerge Cycle Events ──

export interface AutoMergeCycleEvent extends BaseEvent {
  type: 'automerge.cycle';
  action: 'start' | 'end';
  repos_checked: number;
  prs_processed?: number;
  merged?: number;
  failed?: number;
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
  | AgentStartEvent
  | AgentStopEvent
  | TaskCompletedEvent
  | MergeOkEvent
  | MergeFailEvent
  | PrTestedEvent
  | A0HealthCheckEvent
  | AutoMergeCycleEvent
  | CustomEvent;

// ── Input type for appendEvent (without auto-injected fields) ──

export type EventInput = Omit<PAIEvent, 'timestamp' | 'session_id'>;
