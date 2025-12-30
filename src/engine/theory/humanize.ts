/**
 * Humanization Module
 *
 * Adds timing and velocity variations to make music feel more human.
 */

import { NoteEvent, TICKS_PER_BEAT } from "../../types/engine.js";

// =============================================================================
// TYPES
// =============================================================================

export interface HumanizeOptions {
  /** Timing variation amount 0-1 */
  timing?: number;
  /** Velocity variation amount 0-1 */
  velocity?: number;
  /** Swing amount 0-1 (0 = straight, 0.33 = triplet swing) */
  swing?: number;
  /** Whether to add accents on downbeats */
  accentDownbeats?: boolean;
  /** Accent strength 0-1 */
  accentStrength?: number;
}

// =============================================================================
// HUMANIZE FUNCTIONS
// =============================================================================

/**
 * Apply humanization to a list of note events
 */
export function humanize(events: NoteEvent[], options: HumanizeOptions = {}): NoteEvent[] {
  const {
    timing = 0.3,
    velocity = 0.2,
    swing = 0,
    accentDownbeats = true,
    accentStrength = 0.15,
  } = options;

  return events.map(event => {
    let { startTick, velocity: vel, ...rest } = event;

    // Determine if this is on an offbeat (for swing)
    const beatPosition = startTick / TICKS_PER_BEAT;
    const isOffbeat = (beatPosition % 1) > 0.4 && (beatPosition % 1) < 0.6;
    const isDownbeat = Math.abs(beatPosition % 1) < 0.1;

    // Apply swing
    if (isOffbeat && swing > 0) {
      startTick += Math.round(swing * TICKS_PER_BEAT * 0.33);
    }

    // Apply timing variation
    if (timing > 0) {
      const maxTimingOffset = timing * 30; // Max ~30 ticks variation
      startTick += Math.round((Math.random() - 0.5) * 2 * maxTimingOffset);
    }

    // Apply velocity variation
    if (velocity > 0) {
      const maxVelOffset = velocity * 25; // Max ~25 velocity variation
      vel += Math.round((Math.random() - 0.5) * 2 * maxVelOffset);
    }

    // Apply downbeat accent
    if (accentDownbeats && isDownbeat) {
      vel += Math.round(accentStrength * 20);
    }

    // Clamp values
    startTick = Math.max(0, startTick);
    vel = Math.max(1, Math.min(127, vel));

    return {
      ...rest,
      startTick,
      velocity: vel,
    };
  });
}

/**
 * Apply swing to events
 */
export function applySwing(events: NoteEvent[], swingAmount: number): NoteEvent[] {
  return events.map(event => {
    const beatPosition = event.startTick / TICKS_PER_BEAT;
    const positionInBeat = beatPosition % 1;

    // Swing the second 8th note of each beat
    if (positionInBeat > 0.4 && positionInBeat < 0.6) {
      return {
        ...event,
        startTick: event.startTick + Math.round(swingAmount * TICKS_PER_BEAT * 0.33),
      };
    }

    return event;
  });
}

/**
 * Add velocity dynamics based on position in phrase
 */
export function addDynamics(
  events: NoteEvent[],
  phraseLength: number = 4, // beats
  dynamicRange: number = 0.3
): NoteEvent[] {
  const phraseTicks = phraseLength * TICKS_PER_BEAT;

  return events.map(event => {
    const positionInPhrase = (event.startTick % phraseTicks) / phraseTicks;

    // Crescendo towards middle, diminuendo towards end
    let dynamicMultiplier: number;
    if (positionInPhrase < 0.5) {
      dynamicMultiplier = 0.8 + positionInPhrase * 0.4; // 0.8 -> 1.0
    } else {
      dynamicMultiplier = 1.0 - (positionInPhrase - 0.5) * 0.4; // 1.0 -> 0.8
    }

    const velocityAdjust = Math.round((dynamicMultiplier - 0.9) * 127 * dynamicRange);

    return {
      ...event,
      velocity: Math.max(1, Math.min(127, event.velocity + velocityAdjust)),
    };
  });
}

/**
 * Slightly randomize note durations for a more natural feel
 */
export function humanizeDurations(events: NoteEvent[], amount: number = 0.1): NoteEvent[] {
  return events.map(event => {
    const variation = 1 + (Math.random() - 0.5) * 2 * amount;
    const newDuration = Math.round(event.durationTicks * variation);

    return {
      ...event,
      durationTicks: Math.max(10, newDuration),
    };
  });
}

/**
 * Full humanization pipeline
 */
export function fullHumanize(
  events: NoteEvent[],
  options: HumanizeOptions & {
    dynamicRange?: number;
    durationVariation?: number;
  } = {}
): NoteEvent[] {
  const {
    dynamicRange = 0.2,
    durationVariation = 0.1,
    ...humanizeOpts
  } = options;

  let result = events;

  // Apply in order
  result = humanize(result, humanizeOpts);
  result = addDynamics(result, 4, dynamicRange);
  result = humanizeDurations(result, durationVariation);

  return result;
}
