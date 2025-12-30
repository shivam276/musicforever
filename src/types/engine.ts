/**
 * Types for the Music Engine layer
 * The engine converts ProducerCommands into these playable events
 */

import type { VoiceRole, ProcessingHints } from "./producer.js";

// =============================================================================
// NOTE EVENTS
// =============================================================================

/** Ticks per quarter note (standard MIDI resolution) */
export const TICKS_PER_BEAT = 480;

/**
 * A single note event
 * This is what the Music Engine outputs and Audio Engine plays
 */
export interface NoteEvent {
  /** Start time in ticks (480 ticks = 1 beat) */
  startTick: number;

  /** Duration in ticks */
  durationTicks: number;

  /** MIDI note number (0-127) or note name ("C4", "D#5") */
  pitch: number | string;

  /** Velocity 0-127 */
  velocity: number;

  /** Optional expression data */
  expression?: {
    pitchBend?: number;     // -8192 to 8191
    aftertouch?: number;    // 0-127
  };
}

// =============================================================================
// DRUM EVENTS
// =============================================================================

/** Standard GM drum map */
export const DRUM_MAP = {
  kick: 36,
  kick2: 35,
  snare: 38,
  snareRim: 37,
  snareSide: 40,
  closedHat: 42,
  openHat: 46,
  pedalHat: 44,
  clap: 39,
  tomLow: 45,
  tomMid: 47,
  tomHigh: 50,
  crash: 49,
  crash2: 57,
  ride: 51,
  rideBell: 53,
  tambourine: 54,
  cowbell: 56,
  shaker: 70,
} as const;

export type DrumSound = keyof typeof DRUM_MAP;

// =============================================================================
// TRACKS
// =============================================================================

/** Instrument type for audio engine */
export type InstrumentType =
  | "piano"
  | "rhodes"
  | "synth-lead"
  | "synth-pad"
  | "bass-synth"
  | "bass-acoustic"
  | "drums"
  | "strings"
  | "organ";

/** Effect settings for a track */
export interface EffectSettings {
  /** Reverb wet 0-1 */
  reverb?: number;
  /** Delay wet 0-1 */
  delay?: number;
  /** Filter cutoff in Hz */
  filterCutoff?: number;
  /** Filter type */
  filterType?: "lowpass" | "highpass" | "bandpass";
  /** Distortion/saturation 0-1 */
  distortion?: number;
  /** Pan -1 to 1 */
  pan?: number;
  /** Volume 0-1 */
  volume?: number;
}

/**
 * A single track in a music segment
 */
export interface Track {
  id: string;
  role: VoiceRole;
  instrument: InstrumentType;
  events: NoteEvent[];
  effects: EffectSettings;
}

// =============================================================================
// AUTOMATION
// =============================================================================

/** Automation curve type */
export type CurveType = "linear" | "exponential" | "step";

/** Single automation point */
export interface AutomationPoint {
  tick: number;
  value: number;
  curve: CurveType;
}

/** Automation lane for a parameter */
export interface AutomationLane {
  /** Parameter path: "filter.frequency", "reverb.wet", etc. */
  parameter: string;
  points: AutomationPoint[];
}

// =============================================================================
// MUSIC SEGMENT
// =============================================================================

/**
 * Complete music segment ready for playback
 * This is the output of the Music Engine
 */
export interface MusicSegment {
  id: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Tempo in BPM */
  tempo: number;
  /** Time signature */
  timeSignature: { beats: number; subdivision: number };
  /** All tracks with their note events */
  tracks: Track[];
  /** Automation data */
  automation: AutomationLane[];
  /** Processing hints from producer */
  processing?: ProcessingHints;
}

// =============================================================================
// PATTERN TYPES (for drum/bass/arp generators)
// =============================================================================

/**
 * A step in a pattern (16th note grid)
 * 0 = rest, 1-127 = hit with velocity
 */
export type PatternStep = number;

/**
 * A full pattern (typically 16 steps = 1 bar)
 */
export type Pattern = PatternStep[];

/**
 * Drum pattern with multiple sounds
 */
export interface DrumPattern {
  name: string;
  /** Pattern for each drum sound (16 steps) */
  sounds: Partial<Record<DrumSound, Pattern>>;
  /** Swing amount 0-1 */
  swing?: number;
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/** Convert ticks to seconds */
export function ticksToSeconds(ticks: number, bpm: number): number {
  const beatsPerSecond = bpm / 60;
  const beats = ticks / TICKS_PER_BEAT;
  return beats / beatsPerSecond;
}

/** Convert seconds to ticks */
export function secondsToTicks(seconds: number, bpm: number): number {
  const beatsPerSecond = bpm / 60;
  const beats = seconds * beatsPerSecond;
  return Math.round(beats * TICKS_PER_BEAT);
}

/** Convert beats to ticks */
export function beatsToTicks(beats: number): number {
  return Math.round(beats * TICKS_PER_BEAT);
}

/** Get ticks for common note durations */
export const NOTE_DURATIONS = {
  whole: TICKS_PER_BEAT * 4,
  half: TICKS_PER_BEAT * 2,
  quarter: TICKS_PER_BEAT,
  eighth: TICKS_PER_BEAT / 2,
  sixteenth: TICKS_PER_BEAT / 4,
  tripletQuarter: Math.round(TICKS_PER_BEAT * 2 / 3),
  tripletEighth: Math.round(TICKS_PER_BEAT / 3),
  tripletSixteenth: Math.round(TICKS_PER_BEAT / 6),
  dottedHalf: TICKS_PER_BEAT * 3,
  dottedQuarter: Math.round(TICKS_PER_BEAT * 1.5),
  dottedEighth: Math.round(TICKS_PER_BEAT * 0.75),
} as const;
