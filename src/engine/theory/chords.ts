/**
 * Chord Voicer
 *
 * Generates chord voicings with proper voice leading using tonal library.
 */

import { Chord, Note, Interval, VoicingDictionary, Voicing } from "tonal";
import type { ChordColor } from "../../types/producer.js";
import { NoteEvent, TICKS_PER_BEAT, NOTE_DURATIONS } from "../../types/engine.js";

// =============================================================================
// TYPES
// =============================================================================

export interface ChordVoicerOptions {
  /** Chord symbol (e.g., "Dm7", "G7", "Cmaj7") */
  chord: string;
  /** Voicing color/style */
  color?: ChordColor;
  /** Previous voicing for voice leading */
  previousVoicing?: string[];
  /** Lowest note allowed */
  minNote?: string;
  /** Highest note allowed */
  maxNote?: string;
  /** Number of voices (3-5) */
  voiceCount?: number;
  /** Base octave */
  octave?: number;
}

export interface ChordGeneratorOptions extends ChordVoicerOptions {
  /** Pattern style */
  pattern?: "sustained" | "rhythmic-stabs" | "arpeggiated" | "shell-voicings";
  /** Duration in beats */
  beats?: number;
  /** Starting tick */
  startTick?: number;
  /** Velocity */
  velocity?: number;
  /** Humanization 0-1 */
  humanize?: number;
  /** Energy level 0-1 */
  energy?: number;
}

// =============================================================================
// VOICING HELPERS
// =============================================================================

/** Get notes of a chord */
function getChordNotes(chordSymbol: string): string[] {
  const chord = Chord.get(chordSymbol);
  return chord.notes.length > 0 ? chord.notes : ["C", "E", "G"];
}

/** Get shell voicing (root + 3rd + 7th) */
function getShellVoicing(chordSymbol: string): string[] {
  const chord = Chord.get(chordSymbol);
  const notes = chord.notes;

  if (notes.length < 3) return notes;

  // Root, 3rd, 7th (if exists) or 5th
  const shell = [notes[0]];
  if (notes[1]) shell.push(notes[1]); // 3rd
  if (notes.length >= 4 && notes[3]) {
    shell.push(notes[3]); // 7th
  } else if (notes[2]) {
    shell.push(notes[2]); // 5th
  }

  return shell;
}

/** Add octave numbers to notes */
function addOctaves(notes: string[], baseOctave: number, spread: boolean = false): string[] {
  return notes.map((note, i) => {
    const octaveOffset = spread ? Math.floor(i / 2) : 0;
    return `${note}${baseOctave + octaveOffset}`;
  });
}

/** Convert note with octave to MIDI number */
function noteToMidi(note: string): number {
  const midi = Note.midi(note);
  return midi ?? 60;
}

/** Apply simple voice leading - minimize movement */
function applyVoiceLeading(
  targetNotes: string[],
  previousNotes: string[],
  octave: number
): string[] {
  if (previousNotes.length === 0) {
    return addOctaves(targetNotes, octave, true);
  }

  const result: string[] = [];
  const prevMidi = previousNotes.map(n => Note.midi(n) ?? 60);

  for (const note of targetNotes) {
    // Find octave that minimizes distance to closest previous note
    let bestOctave = octave;
    let bestDistance = Infinity;

    for (let oct = octave - 1; oct <= octave + 1; oct++) {
      const midi = Note.midi(`${note}${oct}`) ?? 60;
      const minDist = Math.min(...prevMidi.map(p => Math.abs(midi - p)));
      if (minDist < bestDistance) {
        bestDistance = minDist;
        bestOctave = oct;
      }
    }

    result.push(`${note}${bestOctave}`);
  }

  return result;
}

// =============================================================================
// CHORD VOICER CLASS
// =============================================================================

export class ChordVoicer {
  /**
   * Generate a voicing for a chord
   */
  voice(options: ChordVoicerOptions): string[] {
    const {
      chord,
      color = "simple",
      previousVoicing = [],
      octave = 4,
      voiceCount = 4,
    } = options;

    let notes: string[];

    switch (color) {
      case "shell-voicings":
      case "jazzy":
        notes = getShellVoicing(chord);
        break;
      case "simple":
        notes = getChordNotes(chord).slice(0, 3); // Triad
        break;
      case "open":
        notes = this.getOpenVoicing(chord);
        break;
      default:
        notes = getChordNotes(chord).slice(0, voiceCount);
    }

    // Apply voice leading if we have previous voicing
    if (previousVoicing.length > 0) {
      return applyVoiceLeading(notes, previousVoicing, octave);
    }

    return addOctaves(notes, octave, true);
  }

  /**
   * Get open/spread voicing
   */
  private getOpenVoicing(chordSymbol: string): string[] {
    const notes = getChordNotes(chordSymbol);
    if (notes.length < 3) return notes;

    // Spread: root low, 5th mid, 3rd high
    return [notes[0], notes[2] ?? notes[1], notes[1]];
  }
}

// =============================================================================
// CHORD PATTERN GENERATOR
// =============================================================================

export class ChordGenerator {
  private voicer = new ChordVoicer();

  /**
   * Generate chord events for playback
   */
  generate(options: ChordGeneratorOptions): NoteEvent[] {
    const {
      chord,
      pattern = "sustained",
      beats = 4,
      startTick = 0,
      velocity = 70,
      humanize = 0.2,
      energy = 0.6,
      ...voicerOptions
    } = options;

    const voicing = this.voicer.voice({ chord, ...voicerOptions });

    switch (pattern) {
      case "sustained":
        return this.sustained(voicing, beats, startTick, velocity, humanize);
      case "rhythmic-stabs":
        return this.rhythmicStabs(voicing, beats, startTick, velocity, humanize, energy);
      case "shell-voicings":
        return this.shellComping(voicing, beats, startTick, velocity, humanize, energy);
      default:
        return this.sustained(voicing, beats, startTick, velocity, humanize);
    }
  }

  /**
   * Sustained chord - hold for full duration
   */
  private sustained(
    voicing: string[],
    beats: number,
    startTick: number,
    velocity: number,
    humanize: number
  ): NoteEvent[] {
    const events: NoteEvent[] = [];
    const duration = beats * TICKS_PER_BEAT - 20;

    for (const note of voicing) {
      const velOffset = Math.round((Math.random() - 0.5) * humanize * 10);
      const tickOffset = Math.round((Math.random() - 0.5) * humanize * 20);

      events.push({
        startTick: startTick + tickOffset,
        durationTicks: duration,
        pitch: noteToMidi(note),
        velocity: Math.max(40, Math.min(127, velocity + velOffset)),
      });
    }

    return events;
  }

  /**
   * Rhythmic stabs - short hits on specific beats
   */
  private rhythmicStabs(
    voicing: string[],
    beats: number,
    startTick: number,
    velocity: number,
    humanize: number,
    energy: number
  ): NoteEvent[] {
    const events: NoteEvent[] = [];

    // Hit pattern depends on energy
    // Low energy: 1, 3
    // High energy: 1, 2&, 3, 4&
    const hitBeats = energy > 0.6
      ? [0, 1.5, 2, 3.5]
      : [0, 2];

    for (const beatOffset of hitBeats) {
      if (beatOffset >= beats) continue;

      const tick = startTick + Math.round(beatOffset * TICKS_PER_BEAT);
      const isAccent = beatOffset === 0 || beatOffset === 2;

      for (const note of voicing) {
        const velOffset = Math.round((Math.random() - 0.5) * humanize * 15);
        const tickOffset = Math.round((Math.random() - 0.5) * humanize * 15);
        const baseVel = isAccent ? velocity + 15 : velocity - 10;

        events.push({
          startTick: tick + tickOffset,
          durationTicks: NOTE_DURATIONS.eighth,
          pitch: noteToMidi(note),
          velocity: Math.max(40, Math.min(127, baseVel + velOffset)),
        });
      }
    }

    return events;
  }

  /**
   * Shell voicing comping - jazz style
   */
  private shellComping(
    voicing: string[],
    beats: number,
    startTick: number,
    velocity: number,
    humanize: number,
    energy: number
  ): NoteEvent[] {
    const events: NoteEvent[] = [];

    // Charleston rhythm: 1, 2&, or more complex at high energy
    const rhythmPattern = energy > 0.7
      ? [0, 1.5, 2.5, 3]       // Busy comping
      : [0, 1.5];              // Basic Charleston

    for (const beatOffset of rhythmPattern) {
      if (beatOffset >= beats) continue;

      const tick = startTick + Math.round(beatOffset * TICKS_PER_BEAT);
      const duration = beatOffset === 0 ? NOTE_DURATIONS.dottedQuarter : NOTE_DURATIONS.eighth;

      for (const note of voicing) {
        const velOffset = Math.round((Math.random() - 0.5) * humanize * 20);
        const tickOffset = Math.round((Math.random() - 0.5) * humanize * 25); // More humanize for jazz

        events.push({
          startTick: tick + tickOffset,
          durationTicks: duration,
          pitch: noteToMidi(note),
          velocity: Math.max(40, Math.min(100, velocity + velOffset)), // Softer for jazz
        });
      }
    }

    return events;
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/** Generate voicing for a chord */
export function voiceChord(chord: string, options?: Partial<ChordVoicerOptions>): string[] {
  const voicer = new ChordVoicer();
  return voicer.voice({ chord, ...options });
}

/** Generate chord events */
export function generateChordEvents(options: ChordGeneratorOptions): NoteEvent[] {
  const generator = new ChordGenerator();
  return generator.generate(options);
}

/** Generate chords for a progression */
export function generateChordsForProgression(
  chords: string[],
  beatsPerChord: number,
  pattern: ChordGeneratorOptions["pattern"] = "sustained",
  options: Partial<ChordGeneratorOptions> = {}
): NoteEvent[] {
  const generator = new ChordGenerator();
  const events: NoteEvent[] = [];
  let currentTick = options.startTick ?? 0;
  let previousVoicing: string[] = [];

  for (const chord of chords) {
    const chordEvents = generator.generate({
      ...options,
      chord,
      pattern,
      beats: beatsPerChord,
      startTick: currentTick,
      previousVoicing,
    });

    events.push(...chordEvents);

    // Update previous voicing for voice leading
    previousVoicing = voiceChord(chord, { ...options, previousVoicing });
    currentTick += beatsPerChord * TICKS_PER_BEAT;
  }

  return events;
}
