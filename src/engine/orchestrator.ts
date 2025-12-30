/**
 * Music Engine Orchestrator
 *
 * Combines all generators (drums, bass, chords, melody, arpeggio)
 * to create complete music segments from ProducerCommands.
 */

import type {
  ProducerCommand,
  VoiceAssignment,
  VoiceRole,
  PatternHint,
  Genre,
} from "../types/producer.js";
import type {
  MusicSegment,
  Track,
  NoteEvent,
  InstrumentType,
  EffectSettings,
} from "../types/engine.js";
import { TICKS_PER_BEAT } from "../types/engine.js";

import { DrumGenerator, generateDrumPattern } from "./theory/drums.js";
import { BassGenerator, generateBassForProgression } from "./theory/bass.js";
import { ChordGenerator, generateChordsForProgression } from "./theory/chords.js";
import { ArpeggioGenerator, generateArpeggioForProgression } from "./theory/arpeggio.js";
import { MelodyGenerator, generateMelodyForProgression } from "./theory/melody.js";
import { fullHumanize } from "./theory/humanize.js";

// =============================================================================
// TYPES
// =============================================================================

export interface OrchestratorOptions {
  /** Genre for instrument/effect selection */
  genre?: Genre;
}

// =============================================================================
// INSTRUMENT MAPPING
// =============================================================================

function getInstrumentForRole(role: VoiceRole, genre: Genre): InstrumentType {
  const mapping: Record<Genre, Record<VoiceRole, InstrumentType>> = {
    lofi: {
      lead: "piano",
      harmony: "rhodes",
      bass: "bass-synth",
      rhythm: "drums",
      texture: "synth-pad",
      arpeggio: "rhodes",
    },
    jazz: {
      lead: "piano",
      harmony: "piano",
      bass: "bass-acoustic",
      rhythm: "drums",
      texture: "strings",
      arpeggio: "piano",
    },
    house: {
      lead: "synth-lead",
      harmony: "synth-pad",
      bass: "bass-synth",
      rhythm: "drums",
      texture: "synth-pad",
      arpeggio: "synth-lead",
    },
    techno: {
      lead: "synth-lead",
      harmony: "synth-pad",
      bass: "bass-synth",
      rhythm: "drums",
      texture: "synth-pad",
      arpeggio: "synth-lead",
    },
    ambient: {
      lead: "synth-pad",
      harmony: "synth-pad",
      bass: "bass-synth",
      rhythm: "drums",
      texture: "strings",
      arpeggio: "synth-pad",
    },
  };

  return mapping[genre]?.[role] ?? "piano";
}

function getEffectsForGenre(genre: Genre, role: VoiceRole): EffectSettings {
  const baseEffects: EffectSettings = {
    reverb: 0.3,
    volume: 0.8,
  };

  switch (genre) {
    case "lofi":
      return {
        ...baseEffects,
        reverb: 0.4,
        filterCutoff: 4000,
        filterType: "lowpass",
      };
    case "jazz":
      return {
        ...baseEffects,
        reverb: 0.5,
      };
    case "house":
      return {
        ...baseEffects,
        reverb: 0.2,
        delay: role === "lead" ? 0.3 : 0,
      };
    case "ambient":
      return {
        ...baseEffects,
        reverb: 0.7,
        delay: 0.4,
      };
    default:
      return baseEffects;
  }
}

// =============================================================================
// ORCHESTRATOR CLASS
// =============================================================================

export class MusicEngineOrchestrator {
  private drumGenerator = new DrumGenerator();
  private bassGenerator = new BassGenerator();
  private chordGenerator = new ChordGenerator();
  private arpeggioGenerator = new ArpeggioGenerator();
  private melodyGenerator = new MelodyGenerator();

  private genre: Genre = "lofi";

  constructor(options: OrchestratorOptions = {}) {
    this.genre = options.genre ?? "lofi";
  }

  /**
   * Process a ProducerCommand into a playable MusicSegment
   */
  process(command: ProducerCommand): MusicSegment {
    const { musical, arrangement, expression } = command;

    // Calculate timing
    const beatsPerChord = this.getBeatsPerChord(musical.harmonicRhythm);
    const totalBeats = musical.chordProgression.length * beatsPerChord;
    const totalTicks = totalBeats * TICKS_PER_BEAT;
    const durationMs = (totalBeats / (musical.tempo.bpm / 60)) * 1000;

    // Generate tracks for each active voice
    const tracks: Track[] = [];

    for (const voice of arrangement.activeVoices) {
      if (voice.activity === "silent") continue;

      const events = this.generateVoiceEvents(
        voice,
        musical,
        expression,
        beatsPerChord,
        totalBeats
      );

      if (events.length === 0) continue;

      // Apply humanization
      const humanizedEvents = fullHumanize(events, {
        timing: expression.humanize,
        velocity: expression.humanize * 0.7,
        swing: expression.swing,
        accentDownbeats: voice.role === "rhythm",
      });

      tracks.push({
        id: `track-${voice.role}`,
        role: voice.role,
        instrument: getInstrumentForRole(voice.role, this.genre),
        events: humanizedEvents,
        effects: getEffectsForGenre(this.genre, voice.role),
      });
    }

    return {
      id: command.segmentId,
      durationMs,
      tempo: musical.tempo.bpm,
      timeSignature: musical.timeSignature,
      tracks,
      automation: [],
      processing: expression.processing,
    };
  }

  /**
   * Generate events for a specific voice
   */
  private generateVoiceEvents(
    voice: VoiceAssignment,
    musical: ProducerCommand["musical"],
    expression: ProducerCommand["expression"],
    beatsPerChord: number,
    totalBeats: number
  ): NoteEvent[] {
    const chords = musical.chordProgression.map(c => c.symbol);
    const scale = `${musical.key.root} ${musical.key.mode}`;
    const patternHint = voice.patternHint ?? this.getDefaultPattern(voice.role);

    // Calculate bars for drums
    const bars = Math.ceil(totalBeats / 4);

    const baseOptions = {
      humanize: expression.humanize,
      energy: expression.energy,
      swing: expression.swing,
    };

    switch (voice.role) {
      case "rhythm":
        return this.drumGenerator.generate({
          patternHint,
          bars,
          ...baseOptions,
        });

      case "bass":
        return generateBassForProgression(
          chords,
          beatsPerChord,
          patternHint,
          {
            ...baseOptions,
            octave: 2,
          }
        );

      case "harmony":
        return generateChordsForProgression(
          chords,
          beatsPerChord,
          this.mapToChordPattern(patternHint),
          {
            ...baseOptions,
            octave: 4,
            velocity: 65,
          }
        );

      case "arpeggio":
        return generateArpeggioForProgression(
          chords,
          beatsPerChord,
          "up-down",
          expression.energy > 0.6 ? "sixteenth" : "eighth",
          {
            ...baseOptions,
            octave: 4,
            velocity: 60,
          }
        );

      case "lead":
        return generateMelodyForProgression(
          chords,
          scale,
          beatsPerChord,
          patternHint,
          {
            ...baseOptions,
            octave: voice.register === "high" ? 5 : 4,
            velocity: 75,
            tension: expression.tension,
          }
        );

      case "texture":
        // Texture = sustained chords, very soft
        return generateChordsForProgression(
          chords,
          beatsPerChord * 2, // Longer sustain
          "sustained",
          {
            ...baseOptions,
            octave: 5,
            velocity: 45,
          }
        );

      default:
        return [];
    }
  }

  /**
   * Get beats per chord from harmonic rhythm
   */
  private getBeatsPerChord(rhythm: ProducerCommand["musical"]["harmonicRhythm"]): number {
    switch (rhythm) {
      case "slow": return 8;
      case "medium": return 4;
      case "fast": return 2;
      case "irregular": return 4; // Default, could be more complex
      default: return 4;
    }
  }

  /**
   * Get default pattern for voice role
   */
  private getDefaultPattern(role: VoiceRole): PatternHint {
    const defaults: Record<VoiceRole, PatternHint> = {
      lead: "lyrical",
      harmony: "sustained",
      bass: "root-fifth",
      rhythm: "boom-bap",
      texture: "sustained",
      arpeggio: "arpeggiated",
    };
    return defaults[role];
  }

  /**
   * Map pattern hint to chord pattern type
   */
  private mapToChordPattern(hint: PatternHint): "sustained" | "rhythmic-stabs" | "shell-voicings" {
    switch (hint) {
      case "sustained": return "sustained";
      case "rhythmic-stabs": return "rhythmic-stabs";
      case "shell-voicings": return "shell-voicings";
      default: return "sustained";
    }
  }

  /**
   * Set genre for instrument/effect selection
   */
  setGenre(genre: Genre): void {
    this.genre = genre;
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Quick function to generate a segment from a command
 */
export function generateSegment(
  command: ProducerCommand,
  genre: Genre = "lofi"
): MusicSegment {
  const orchestrator = new MusicEngineOrchestrator({ genre });
  return orchestrator.process(command);
}

/**
 * Create a simple ProducerCommand for testing
 */
export function createTestCommand(
  chords: string[] = ["Dm7", "G7", "Cmaj7", "Am7"],
  options: {
    bpm?: number;
    key?: string;
    mode?: string;
    energy?: number;
    voices?: VoiceRole[];
  } = {}
): ProducerCommand {
  const {
    bpm = 90,
    key = "C",
    mode = "major",
    energy = 0.6,
    voices = ["rhythm", "bass", "harmony", "lead"],
  } = options;

  return {
    version: "1.0",
    segmentId: `test-${Date.now()}`,
    timestamp: Date.now(),
    musical: {
      chordProgression: chords.map(c => ({ symbol: c, duration: 4 })),
      key: { root: key, mode: mode as any },
      timeSignature: { beats: 4, subdivision: 4 },
      tempo: { bpm },
      harmonicRhythm: "medium",
    },
    arrangement: {
      activeVoices: voices.map(role => ({
        role,
        activity: "normal" as const,
      })),
      sectionType: "verse",
      density: "medium",
    },
    expression: {
      energy,
      tension: 0.3,
      dynamics: { overall: "mf", variation: "breathing" },
      humanize: 0.3,
      swing: 0.15,
    },
  };
}
