/**
 * Arpeggio Generator
 *
 * Generates arpeggiated patterns from chords.
 */

import { Chord, Note } from "tonal";
import { NoteEvent, TICKS_PER_BEAT, NOTE_DURATIONS } from "../../types/engine.js";

// =============================================================================
// TYPES
// =============================================================================

export type ArpeggioPattern =
  | "up"
  | "down"
  | "up-down"
  | "down-up"
  | "random"
  | "pattern-1"   // 1-3-5-3
  | "pattern-2"   // 1-5-3-5
  | "broken";     // Random but musical

export type ArpeggioRate = "quarter" | "eighth" | "sixteenth" | "triplet";

export interface ArpeggioGeneratorOptions {
  /** Chord symbol */
  chord: string;
  /** Arpeggio pattern */
  pattern?: ArpeggioPattern;
  /** Note rate */
  rate?: ArpeggioRate;
  /** Duration in beats */
  beats?: number;
  /** Base octave */
  octave?: number;
  /** Octave range to span */
  octaveRange?: number;
  /** Starting tick */
  startTick?: number;
  /** Base velocity */
  velocity?: number;
  /** Humanization 0-1 */
  humanize?: number;
  /** Energy 0-1 (affects velocity variation) */
  energy?: number;
}

// =============================================================================
// HELPERS
// =============================================================================

function getChordNotes(chord: string): string[] {
  const c = Chord.get(chord);
  return c.notes.length > 0 ? c.notes : ["C", "E", "G"];
}

function noteToMidi(note: string, octave: number): number {
  return Note.midi(`${note}${octave}`) ?? 60;
}

function getRateTicks(rate: ArpeggioRate): number {
  switch (rate) {
    case "quarter": return NOTE_DURATIONS.quarter;
    case "eighth": return NOTE_DURATIONS.eighth;
    case "sixteenth": return NOTE_DURATIONS.sixteenth;
    case "triplet": return NOTE_DURATIONS.tripletEighth;
    default: return NOTE_DURATIONS.eighth;
  }
}

// =============================================================================
// ARPEGGIO GENERATOR
// =============================================================================

export class ArpeggioGenerator {
  generate(options: ArpeggioGeneratorOptions): NoteEvent[] {
    const {
      chord,
      pattern = "up",
      rate = "eighth",
      beats = 4,
      octave = 4,
      octaveRange = 1,
      startTick = 0,
      velocity = 70,
      humanize = 0.2,
      energy = 0.6,
    } = options;

    const chordNotes = getChordNotes(chord);
    const ticksPerNote = getRateTicks(rate);
    const totalTicks = beats * TICKS_PER_BEAT;
    const noteCount = Math.floor(totalTicks / ticksPerNote);

    // Build sequence of notes across octaves
    const sequence = this.buildSequence(chordNotes, octave, octaveRange, pattern, noteCount);

    // Generate events
    const events: NoteEvent[] = [];
    for (let i = 0; i < noteCount; i++) {
      const noteInfo = sequence[i % sequence.length];
      const tick = startTick + i * ticksPerNote;

      // Humanize
      const tickOffset = Math.round((Math.random() - 0.5) * humanize * 20);
      const velOffset = Math.round((Math.random() - 0.5) * humanize * 15);

      // Accent first note of each beat
      const isDownbeat = (i * ticksPerNote) % TICKS_PER_BEAT === 0;
      const accentVel = isDownbeat ? 15 : 0;

      events.push({
        startTick: Math.max(0, tick + tickOffset),
        durationTicks: ticksPerNote - 10,
        pitch: noteInfo.midi,
        velocity: Math.max(40, Math.min(127, velocity + velOffset + accentVel)),
      });
    }

    return events;
  }

  private buildSequence(
    notes: string[],
    baseOctave: number,
    octaveRange: number,
    pattern: ArpeggioPattern,
    count: number
  ): Array<{ note: string; octave: number; midi: number }> {
    // Build all notes across octave range
    const allNotes: Array<{ note: string; octave: number; midi: number }> = [];

    for (let oct = baseOctave; oct < baseOctave + octaveRange; oct++) {
      for (const note of notes) {
        allNotes.push({
          note,
          octave: oct,
          midi: noteToMidi(note, oct),
        });
      }
    }

    // Sort by pitch
    allNotes.sort((a, b) => a.midi - b.midi);

    // Apply pattern
    switch (pattern) {
      case "up":
        return allNotes;

      case "down":
        return [...allNotes].reverse();

      case "up-down": {
        const up = [...allNotes];
        const down = [...allNotes].reverse().slice(1, -1);
        return [...up, ...down];
      }

      case "down-up": {
        const down = [...allNotes].reverse();
        const up = [...allNotes].slice(1, -1);
        return [...down, ...up];
      }

      case "random":
        return this.shuffle([...allNotes]);

      case "pattern-1": {
        // 1-3-5-3 style
        if (notes.length >= 3) {
          const o = baseOctave;
          return [
            { note: notes[0], octave: o, midi: noteToMidi(notes[0], o) },
            { note: notes[1], octave: o, midi: noteToMidi(notes[1], o) },
            { note: notes[2], octave: o, midi: noteToMidi(notes[2], o) },
            { note: notes[1], octave: o, midi: noteToMidi(notes[1], o) },
          ];
        }
        return allNotes;
      }

      case "pattern-2": {
        // 1-5-3-5 style
        if (notes.length >= 3) {
          const o = baseOctave;
          return [
            { note: notes[0], octave: o, midi: noteToMidi(notes[0], o) },
            { note: notes[2], octave: o, midi: noteToMidi(notes[2], o) },
            { note: notes[1], octave: o, midi: noteToMidi(notes[1], o) },
            { note: notes[2], octave: o, midi: noteToMidi(notes[2], o) },
          ];
        }
        return allNotes;
      }

      case "broken": {
        // Skip-step pattern
        const result: typeof allNotes = [];
        for (let i = 0; i < allNotes.length; i += 2) {
          result.push(allNotes[i]);
        }
        for (let i = 1; i < allNotes.length; i += 2) {
          result.push(allNotes[i]);
        }
        return result;
      }

      default:
        return allNotes;
    }
  }

  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export function generateArpeggio(options: ArpeggioGeneratorOptions): NoteEvent[] {
  const generator = new ArpeggioGenerator();
  return generator.generate(options);
}

export function generateArpeggioForProgression(
  chords: string[],
  beatsPerChord: number,
  pattern: ArpeggioPattern = "up",
  rate: ArpeggioRate = "eighth",
  options: Partial<ArpeggioGeneratorOptions> = {}
): NoteEvent[] {
  const generator = new ArpeggioGenerator();
  const events: NoteEvent[] = [];
  let currentTick = options.startTick ?? 0;

  for (const chord of chords) {
    const arpEvents = generator.generate({
      ...options,
      chord,
      pattern,
      rate,
      beats: beatsPerChord,
      startTick: currentTick,
    });

    events.push(...arpEvents);
    currentTick += beatsPerChord * TICKS_PER_BEAT;
  }

  return events;
}
