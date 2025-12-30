/**
 * Melody Generator
 *
 * Generates melodic lines using chord tones and passing tones.
 */

import { Chord, Scale, Note, Interval } from "tonal";
import type { PatternHint, Register } from "../../types/producer.js";
import { NoteEvent, TICKS_PER_BEAT, NOTE_DURATIONS } from "../../types/engine.js";

// =============================================================================
// TYPES
// =============================================================================

export interface MelodyGeneratorOptions {
  /** Chord symbol */
  chord: string;
  /** Scale to use (e.g., "C major", "D dorian") */
  scale?: string;
  /** Pattern style */
  pattern?: PatternHint;
  /** Duration in beats */
  beats?: number;
  /** Register preference */
  register?: Register;
  /** Base octave */
  octave?: number;
  /** Starting tick */
  startTick?: number;
  /** Velocity */
  velocity?: number;
  /** Humanization 0-1 */
  humanize?: number;
  /** Energy 0-1 (affects density and range) */
  energy?: number;
  /** Tension 0-1 (affects dissonance) */
  tension?: number;
  /** Previous note for continuity */
  previousNote?: number;
}

// =============================================================================
// HELPERS
// =============================================================================

function getChordTones(chord: string): string[] {
  const c = Chord.get(chord);
  return c.notes.length > 0 ? c.notes : ["C", "E", "G"];
}

function getScaleNotes(scale: string): string[] {
  const s = Scale.get(scale);
  return s.notes.length > 0 ? s.notes : ["C", "D", "E", "F", "G", "A", "B"];
}

function noteToMidi(note: string, octave: number): number {
  return Note.midi(`${note}${octave}`) ?? 60;
}

function getOctaveForRegister(register: Register): number {
  switch (register) {
    case "low": return 3;
    case "mid": return 4;
    case "high": return 5;
    default: return 4;
  }
}

function pickWeighted<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * total;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }

  return items[items.length - 1];
}

// =============================================================================
// MELODY GENERATOR
// =============================================================================

export class MelodyGenerator {
  generate(options: MelodyGeneratorOptions): NoteEvent[] {
    const {
      chord,
      scale,
      pattern = "lyrical",
      beats = 4,
      register = "mid",
      octave = getOctaveForRegister(register),
      startTick = 0,
      velocity = 75,
      humanize = 0.3,
      energy = 0.6,
      tension = 0.3,
      previousNote,
    } = options;

    const chordTones = getChordTones(chord);
    const scaleNotes = scale ? getScaleNotes(scale) : chordTones;

    switch (pattern) {
      case "lyrical":
        return this.lyrical(chordTones, scaleNotes, beats, octave, startTick, velocity, humanize, energy, previousNote);
      case "riff-based":
        return this.riffBased(chordTones, beats, octave, startTick, velocity, humanize, energy);
      case "improvisatory":
        return this.improvisatory(chordTones, scaleNotes, beats, octave, startTick, velocity, humanize, energy, tension);
      case "call-response":
        return this.callResponse(chordTones, scaleNotes, beats, octave, startTick, velocity, humanize, energy);
      default:
        return this.lyrical(chordTones, scaleNotes, beats, octave, startTick, velocity, humanize, energy, previousNote);
    }
  }

  /**
   * Lyrical melody - longer notes, stepwise motion
   */
  private lyrical(
    chordTones: string[],
    scaleNotes: string[],
    beats: number,
    octave: number,
    startTick: number,
    velocity: number,
    humanize: number,
    energy: number,
    previousNote?: number
  ): NoteEvent[] {
    const events: NoteEvent[] = [];
    let currentTick = startTick;
    const endTick = startTick + beats * TICKS_PER_BEAT;

    // Start with a chord tone
    let lastMidi = previousNote ?? noteToMidi(chordTones[0], octave);

    while (currentTick < endTick) {
      // Choose duration - longer at low energy
      const durations = energy > 0.6
        ? [NOTE_DURATIONS.quarter, NOTE_DURATIONS.eighth, NOTE_DURATIONS.dottedQuarter]
        : [NOTE_DURATIONS.half, NOTE_DURATIONS.dottedQuarter, NOTE_DURATIONS.quarter];
      const weights = energy > 0.6 ? [2, 3, 1] : [2, 2, 1];
      const duration = pickWeighted(durations, weights);

      // Rest sometimes
      if (Math.random() < 0.15) {
        currentTick += NOTE_DURATIONS.quarter;
        continue;
      }

      // Choose note - prefer stepwise motion
      const note = this.chooseStepwiseNote(lastMidi, chordTones, scaleNotes, octave, currentTick === startTick);
      lastMidi = note;

      // Humanize
      const tickOffset = Math.round((Math.random() - 0.5) * humanize * 30);
      const velOffset = Math.round((Math.random() - 0.5) * humanize * 15);

      events.push({
        startTick: Math.max(startTick, currentTick + tickOffset),
        durationTicks: Math.min(duration, endTick - currentTick - 10),
        pitch: note,
        velocity: Math.max(50, Math.min(100, velocity + velOffset)),
      });

      currentTick += duration;
    }

    return events;
  }

  /**
   * Riff-based melody - repetitive pattern
   */
  private riffBased(
    chordTones: string[],
    beats: number,
    octave: number,
    startTick: number,
    velocity: number,
    humanize: number,
    energy: number
  ): NoteEvent[] {
    const events: NoteEvent[] = [];

    // Create a short riff pattern
    const riffNotes = [
      chordTones[0],
      chordTones[2] ?? chordTones[0],
      chordTones[1] ?? chordTones[0],
      chordTones[0],
    ];

    const riffRhythm = [
      NOTE_DURATIONS.eighth,
      NOTE_DURATIONS.eighth,
      NOTE_DURATIONS.quarter,
      NOTE_DURATIONS.quarter,
    ];

    let currentTick = startTick;
    const endTick = startTick + beats * TICKS_PER_BEAT;
    let riffIndex = 0;

    while (currentTick < endTick) {
      const note = riffNotes[riffIndex % riffNotes.length];
      const duration = riffRhythm[riffIndex % riffRhythm.length];
      const midi = noteToMidi(note, octave);

      const tickOffset = Math.round((Math.random() - 0.5) * humanize * 20);
      const velOffset = Math.round((Math.random() - 0.5) * humanize * 10);
      const accent = riffIndex % 4 === 0 ? 10 : 0;

      events.push({
        startTick: Math.max(startTick, currentTick + tickOffset),
        durationTicks: Math.min(duration - 10, endTick - currentTick - 10),
        pitch: midi,
        velocity: Math.max(50, Math.min(110, velocity + velOffset + accent)),
      });

      currentTick += duration;
      riffIndex++;
    }

    return events;
  }

  /**
   * Improvisatory melody - more chromatic, varied rhythm
   */
  private improvisatory(
    chordTones: string[],
    scaleNotes: string[],
    beats: number,
    octave: number,
    startTick: number,
    velocity: number,
    humanize: number,
    energy: number,
    tension: number
  ): NoteEvent[] {
    const events: NoteEvent[] = [];
    let currentTick = startTick;
    const endTick = startTick + beats * TICKS_PER_BEAT;

    let lastMidi = noteToMidi(chordTones[0], octave);

    while (currentTick < endTick) {
      // Varied durations
      const durations = [
        NOTE_DURATIONS.sixteenth,
        NOTE_DURATIONS.eighth,
        NOTE_DURATIONS.tripletEighth,
        NOTE_DURATIONS.quarter,
      ];
      const weights = [energy * 2, 3, 1, 2 - energy];
      const duration = pickWeighted(durations, weights);

      // Rest sometimes (more at low energy)
      if (Math.random() < 0.1 + (1 - energy) * 0.15) {
        currentTick += NOTE_DURATIONS.eighth;
        continue;
      }

      // Choose note - allow chromatic passing tones based on tension
      const useChromaticPassing = Math.random() < tension * 0.3;
      const note = useChromaticPassing
        ? this.chromaticApproach(lastMidi)
        : this.chooseStepwiseNote(lastMidi, chordTones, scaleNotes, octave, false);
      lastMidi = note;

      // Humanize
      const tickOffset = Math.round((Math.random() - 0.5) * humanize * 40);
      const velOffset = Math.round((Math.random() - 0.5) * humanize * 20);

      events.push({
        startTick: Math.max(startTick, currentTick + tickOffset),
        durationTicks: Math.min(duration - 5, endTick - currentTick - 5),
        pitch: note,
        velocity: Math.max(45, Math.min(110, velocity + velOffset)),
      });

      currentTick += duration;
    }

    return events;
  }

  /**
   * Call and response - phrase then answer
   */
  private callResponse(
    chordTones: string[],
    scaleNotes: string[],
    beats: number,
    octave: number,
    startTick: number,
    velocity: number,
    humanize: number,
    energy: number
  ): NoteEvent[] {
    const events: NoteEvent[] = [];
    const halfBeats = Math.floor(beats / 2);

    // Call phrase (first half)
    const callEnd = startTick + halfBeats * TICKS_PER_BEAT;
    let currentTick = startTick;

    while (currentTick < callEnd - NOTE_DURATIONS.quarter) {
      const note = chordTones[Math.floor(Math.random() * chordTones.length)];
      const duration = Math.random() > 0.5 ? NOTE_DURATIONS.quarter : NOTE_DURATIONS.eighth;

      events.push({
        startTick: currentTick,
        durationTicks: duration - 10,
        pitch: noteToMidi(note, octave),
        velocity: velocity + 5,
      });

      currentTick += duration;
    }

    // Gap
    currentTick = callEnd;

    // Response phrase (second half) - similar but ends differently
    const responseEnd = startTick + beats * TICKS_PER_BEAT;
    while (currentTick < responseEnd - NOTE_DURATIONS.quarter) {
      const note = scaleNotes[Math.floor(Math.random() * scaleNotes.length)];
      const duration = Math.random() > 0.5 ? NOTE_DURATIONS.quarter : NOTE_DURATIONS.eighth;

      events.push({
        startTick: currentTick,
        durationTicks: duration - 10,
        pitch: noteToMidi(note, octave),
        velocity: velocity - 5,
      });

      currentTick += duration;
    }

    // End on chord tone
    events.push({
      startTick: responseEnd - NOTE_DURATIONS.quarter,
      durationTicks: NOTE_DURATIONS.quarter - 20,
      pitch: noteToMidi(chordTones[0], octave),
      velocity: velocity,
    });

    return events;
  }

  /**
   * Choose next note with stepwise preference
   */
  private chooseStepwiseNote(
    lastMidi: number,
    chordTones: string[],
    scaleNotes: string[],
    octave: number,
    preferChordTone: boolean
  ): number {
    const pool = preferChordTone ? chordTones : [...scaleNotes, ...chordTones];

    // Find notes near last note
    const candidates: number[] = [];
    for (const note of pool) {
      for (let oct = octave - 1; oct <= octave + 1; oct++) {
        const midi = noteToMidi(note, oct);
        const distance = Math.abs(midi - lastMidi);
        if (distance <= 4) { // Within a major 3rd
          candidates.push(midi);
        }
      }
    }

    if (candidates.length === 0) {
      return noteToMidi(chordTones[0], octave);
    }

    // Weight by distance (closer = more likely)
    const weights = candidates.map(m => 5 - Math.abs(m - lastMidi));
    return pickWeighted(candidates, weights);
  }

  /**
   * Chromatic approach note
   */
  private chromaticApproach(targetMidi: number): number {
    const direction = Math.random() > 0.5 ? 1 : -1;
    return targetMidi + direction;
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export function generateMelody(options: MelodyGeneratorOptions): NoteEvent[] {
  const generator = new MelodyGenerator();
  return generator.generate(options);
}

export function generateMelodyForProgression(
  chords: string[],
  scale: string,
  beatsPerChord: number,
  pattern: PatternHint = "lyrical",
  options: Partial<MelodyGeneratorOptions> = {}
): NoteEvent[] {
  const generator = new MelodyGenerator();
  const events: NoteEvent[] = [];
  let currentTick = options.startTick ?? 0;
  let previousNote: number | undefined;

  for (const chord of chords) {
    const melodyEvents = generator.generate({
      ...options,
      chord,
      scale,
      pattern,
      beats: beatsPerChord,
      startTick: currentTick,
      previousNote,
    });

    events.push(...melodyEvents);

    // Track last note for continuity
    if (melodyEvents.length > 0) {
      const lastEvent = melodyEvents[melodyEvents.length - 1];
      previousNote = typeof lastEvent.pitch === "number" ? lastEvent.pitch : undefined;
    }

    currentTick += beatsPerChord * TICKS_PER_BEAT;
  }

  return events;
}
