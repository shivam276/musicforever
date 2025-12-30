/**
 * Drum Pattern Generator
 *
 * Generates drum patterns for various genres using a step sequencer approach.
 * Patterns are 16 steps (1 bar of 16th notes).
 */

import type { PatternHint } from "../../types/producer.js";
import {
  NoteEvent,
  DrumPattern,
  DrumSound,
  Pattern,
  DRUM_MAP,
  TICKS_PER_BEAT,
} from "../../types/engine.js";

// =============================================================================
// PATTERN LIBRARY
// =============================================================================

/** All built-in drum patterns */
const PATTERNS: Record<string, DrumPattern> = {
  // Lo-fi / Hip-hop patterns
  "boom-bap": {
    name: "Boom Bap",
    sounds: {
      kick: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 80, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0],
      closedHat: [70, 0, 70, 0, 70, 0, 70, 0, 70, 0, 70, 0, 70, 0, 70, 0],
    },
    swing: 0.15,
  },

  "boom-bap-busy": {
    name: "Boom Bap Busy",
    sounds: {
      kick: [100, 0, 0, 0, 0, 0, 70, 0, 0, 0, 90, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 100, 0, 0, 40, 0, 0, 0, 0, 100, 0, 0, 50],
      closedHat: [80, 40, 80, 40, 80, 40, 80, 40, 80, 40, 80, 40, 80, 40, 80, 40],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 60, 0],
    },
    swing: 0.2,
  },

  "lofi-lazy": {
    name: "Lo-fi Lazy",
    sounds: {
      kick: [90, 0, 0, 0, 0, 0, 0, 0, 0, 0, 70, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 80, 0, 0, 0, 0, 0, 0, 0, 80, 0, 0, 0],
      closedHat: [50, 0, 50, 0, 50, 0, 50, 0, 50, 0, 50, 0, 50, 0, 50, 0],
    },
    swing: 0.25,
  },

  // House / EDM patterns
  "four-on-floor": {
    name: "Four on Floor",
    sounds: {
      kick: [110, 0, 0, 0, 110, 0, 0, 0, 110, 0, 0, 0, 110, 0, 0, 0],
      snare: [0, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0],
      closedHat: [0, 0, 90, 0, 0, 0, 90, 0, 0, 0, 90, 0, 0, 0, 90, 0],
      openHat: [0, 0, 0, 0, 0, 0, 0, 70, 0, 0, 0, 0, 0, 0, 0, 70],
    },
    swing: 0,
  },

  "house-groove": {
    name: "House Groove",
    sounds: {
      kick: [110, 0, 0, 0, 110, 0, 0, 0, 110, 0, 0, 0, 110, 0, 0, 0],
      clap: [0, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0],
      closedHat: [80, 50, 80, 50, 80, 50, 80, 50, 80, 50, 80, 50, 80, 50, 80, 50],
      openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 70],
      shaker: [40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40],
    },
    swing: 0,
  },

  // Techno patterns
  "minimal": {
    name: "Minimal Techno",
    sounds: {
      kick: [110, 0, 0, 0, 110, 0, 0, 0, 110, 0, 0, 0, 110, 0, 0, 0],
      closedHat: [0, 0, 70, 0, 0, 0, 70, 0, 0, 0, 70, 0, 0, 0, 70, 0],
    },
    swing: 0,
  },

  "techno-driving": {
    name: "Driving Techno",
    sounds: {
      kick: [120, 0, 0, 0, 120, 0, 0, 0, 120, 0, 0, 0, 120, 0, 0, 0],
      snare: [0, 0, 0, 0, 90, 0, 0, 0, 0, 0, 0, 0, 90, 0, 0, 50],
      closedHat: [90, 60, 90, 60, 90, 60, 90, 60, 90, 60, 90, 60, 90, 60, 90, 60],
      ride: [0, 0, 0, 0, 0, 0, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0],
    },
    swing: 0,
  },

  // Breakbeat patterns
  "breakbeat": {
    name: "Breakbeat",
    sounds: {
      kick: [100, 0, 0, 0, 0, 0, 80, 0, 0, 0, 100, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 100, 0, 0, 80, 0, 0, 0, 0, 100, 0, 0, 0],
      closedHat: [70, 50, 70, 50, 70, 50, 70, 50, 70, 50, 70, 50, 70, 50, 70, 50],
    },
    swing: 0.1,
  },

  // Jazz patterns
  "brushes": {
    name: "Jazz Brushes",
    sounds: {
      kick: [70, 0, 0, 0, 0, 0, 50, 0, 0, 0, 0, 0, 60, 0, 0, 0],
      snareRim: [0, 0, 50, 0, 70, 0, 50, 0, 0, 0, 50, 0, 70, 0, 50, 0],
      ride: [80, 0, 60, 80, 0, 60, 80, 0, 60, 80, 0, 60, 80, 0, 60, 0],
    },
    swing: 0.33,
  },

  "jazz-swing": {
    name: "Jazz Swing",
    sounds: {
      kick: [70, 0, 0, 0, 0, 0, 0, 0, 60, 0, 0, 0, 0, 0, 50, 0],
      snare: [0, 0, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 60, 0, 0, 40],
      ride: [90, 0, 70, 90, 0, 70, 90, 0, 70, 90, 0, 70, 90, 0, 70, 0],
      pedalHat: [0, 0, 0, 0, 50, 0, 0, 0, 0, 0, 0, 0, 50, 0, 0, 0],
    },
    swing: 0.33,
  },

  // Ambient - very sparse
  "ambient-pulse": {
    name: "Ambient Pulse",
    sounds: {
      kick: [50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    swing: 0,
  },

  "ambient-none": {
    name: "No Drums",
    sounds: {},
    swing: 0,
  },
};

// =============================================================================
// PATTERN HINT MAPPING
// =============================================================================

/** Map pattern hints to actual patterns */
const HINT_TO_PATTERNS: Record<PatternHint, string[]> = {
  "boom-bap": ["boom-bap", "boom-bap-busy", "lofi-lazy"],
  "four-on-floor": ["four-on-floor", "house-groove"],
  "minimal": ["minimal", "techno-driving"],
  "breakbeat": ["breakbeat"],
  "brushes": ["brushes", "jazz-swing"],
  // Non-drum hints default to boom-bap
  "walking": ["boom-bap"],
  "root-fifth": ["boom-bap"],
  "octave-pulse": ["four-on-floor"],
  "syncopated": ["breakbeat"],
  "sustained": ["ambient-pulse"],
  "rhythmic-stabs": ["four-on-floor"],
  "arpeggiated": ["minimal"],
  "shell-voicings": ["brushes"],
  "lyrical": ["boom-bap"],
  "riff-based": ["breakbeat"],
  "call-response": ["jazz-swing"],
  "improvisatory": ["brushes"],
};

// =============================================================================
// DRUM GENERATOR CLASS
// =============================================================================

export interface DrumGeneratorOptions {
  /** Pattern hint from producer */
  patternHint?: PatternHint;
  /** Specific pattern name override */
  patternName?: string;
  /** Number of bars to generate */
  bars?: number;
  /** Energy level 0-1 (affects velocity and ghost notes) */
  energy?: number;
  /** Humanization amount 0-1 */
  humanize?: number;
  /** Override swing amount */
  swing?: number;
  /** Starting tick offset */
  startTick?: number;
}

export class DrumGenerator {
  /**
   * Generate drum note events
   */
  generate(options: DrumGeneratorOptions = {}): NoteEvent[] {
    const {
      patternHint = "boom-bap",
      patternName,
      bars = 1,
      energy = 0.7,
      humanize = 0.3,
      swing: swingOverride,
      startTick = 0,
    } = options;

    // Get pattern
    const pattern = patternName
      ? PATTERNS[patternName]
      : this.getPatternForHint(patternHint);

    if (!pattern) {
      return [];
    }

    const swing = swingOverride ?? pattern.swing ?? 0;
    const events: NoteEvent[] = [];
    const stepsPerBar = 16;
    const ticksPerStep = TICKS_PER_BEAT / 4; // 16th notes

    // Generate for each bar
    for (let bar = 0; bar < bars; bar++) {
      const barOffset = bar * stepsPerBar * ticksPerStep;

      // Generate for each drum sound
      for (const [sound, steps] of Object.entries(pattern.sounds)) {
        if (!steps) continue;

        const midiNote = DRUM_MAP[sound as DrumSound];
        if (midiNote === undefined) continue;

        steps.forEach((velocity, stepIndex) => {
          if (velocity === 0) return;

          // Apply energy scaling
          let finalVelocity = Math.round(velocity * (0.5 + energy * 0.5));

          // Add ghost notes at high energy
          if (energy > 0.7 && velocity > 80 && Math.random() < 0.2) {
            // Add ghost note before
            const ghostTick = startTick + barOffset + (stepIndex - 0.5) * ticksPerStep;
            if (ghostTick >= startTick) {
              events.push({
                startTick: Math.round(ghostTick),
                durationTicks: ticksPerStep,
                pitch: midiNote,
                velocity: Math.round(finalVelocity * 0.4),
              });
            }
          }

          // Calculate tick with swing
          let tick = startTick + barOffset + stepIndex * ticksPerStep;

          // Apply swing to offbeats (steps 1, 3, 5, etc.)
          if (stepIndex % 2 === 1 && swing > 0) {
            tick += swing * ticksPerStep * 0.5;
          }

          // Apply humanization
          if (humanize > 0) {
            tick += (Math.random() - 0.5) * humanize * ticksPerStep * 0.3;
            finalVelocity += Math.round((Math.random() - 0.5) * humanize * 20);
          }

          // Clamp velocity
          finalVelocity = Math.max(1, Math.min(127, finalVelocity));

          events.push({
            startTick: Math.round(tick),
            durationTicks: ticksPerStep,
            pitch: midiNote,
            velocity: finalVelocity,
          });
        });
      }
    }

    // Sort by start tick
    events.sort((a, b) => a.startTick - b.startTick);

    return events;
  }

  /**
   * Get a pattern based on hint (with some randomization)
   */
  private getPatternForHint(hint: PatternHint): DrumPattern {
    const patterns = HINT_TO_PATTERNS[hint] ?? ["boom-bap"];
    const patternName = patterns[Math.floor(Math.random() * patterns.length)];
    return PATTERNS[patternName] ?? PATTERNS["boom-bap"];
  }

  /**
   * Get all available pattern names
   */
  getPatternNames(): string[] {
    return Object.keys(PATTERNS);
  }

  /**
   * Get a specific pattern by name
   */
  getPattern(name: string): DrumPattern | undefined {
    return PATTERNS[name];
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/** Create a drum generator and generate events */
export function generateDrumPattern(options?: DrumGeneratorOptions): NoteEvent[] {
  const generator = new DrumGenerator();
  return generator.generate(options);
}

/** Get pattern names for a genre */
export function getPatternsForGenre(
  genre: "lofi" | "house" | "techno" | "jazz" | "ambient"
): string[] {
  switch (genre) {
    case "lofi":
      return ["boom-bap", "boom-bap-busy", "lofi-lazy"];
    case "house":
      return ["four-on-floor", "house-groove"];
    case "techno":
      return ["minimal", "techno-driving"];
    case "jazz":
      return ["brushes", "jazz-swing"];
    case "ambient":
      return ["ambient-pulse", "ambient-none"];
    default:
      return ["boom-bap"];
  }
}
