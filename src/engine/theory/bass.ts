/**
 * Bass Line Generator
 *
 * Generates bass patterns using music theory rules.
 * Uses the tonal library for chord/scale analysis.
 */

import { Chord, Note, Interval } from "tonal";
import type { PatternHint } from "../../types/producer.js";
import { NoteEvent, TICKS_PER_BEAT, NOTE_DURATIONS } from "../../types/engine.js";

// =============================================================================
// TYPES
// =============================================================================

export interface BassGeneratorOptions {
  /** Chord symbol (e.g., "Dm7", "G7", "Cmaj7") */
  chord: string;
  /** Next chord for chromatic approaches */
  nextChord?: string;
  /** Pattern type */
  pattern?: PatternHint;
  /** Number of beats for this chord */
  beats?: number;
  /** Swing amount 0-1 */
  swing?: number;
  /** Humanization 0-1 */
  humanize?: number;
  /** Energy level 0-1 */
  energy?: number;
  /** Base octave (default 2) */
  octave?: number;
  /** Starting tick */
  startTick?: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get root note of a chord */
function getRoot(chordSymbol: string): string {
  const chord = Chord.get(chordSymbol);
  return chord.tonic ?? "C";
}

/** Get fifth of a chord */
function getFifth(chordSymbol: string): string {
  const root = getRoot(chordSymbol);
  return Note.transpose(root, "P5");
}

/** Get third of a chord */
function getThird(chordSymbol: string): string {
  const chord = Chord.get(chordSymbol);
  const notes = chord.notes;
  return notes[1] ?? Note.transpose(chord.tonic ?? "C", "M3");
}

/** Get seventh if exists */
function getSeventh(chordSymbol: string): string | null {
  const chord = Chord.get(chordSymbol);
  const notes = chord.notes;
  return notes.length >= 4 ? notes[3] : null;
}

/** Get chromatic approach note to target */
function getChromaticApproach(target: string, fromBelow: boolean = true): string {
  const semitones = fromBelow ? -1 : 1;
  return Note.transpose(target, Interval.fromSemitones(semitones));
}

/** Convert note name to MIDI with octave */
function noteToMidi(note: string, octave: number): number {
  const midi = Note.midi(`${note}${octave}`);
  return midi ?? 36; // Default to C2
}

/** Apply humanization to timing and velocity */
function humanize(
  tick: number,
  velocity: number,
  amount: number,
  swing: number,
  isOffbeat: boolean
): { tick: number; velocity: number } {
  let newTick = tick;
  let newVelocity = velocity;

  // Apply swing to offbeats
  if (isOffbeat && swing > 0) {
    newTick += swing * (TICKS_PER_BEAT / 4) * 0.5;
  }

  // Random timing variation
  if (amount > 0) {
    newTick += (Math.random() - 0.5) * amount * 30;
    newVelocity += Math.round((Math.random() - 0.5) * amount * 15);
  }

  return {
    tick: Math.round(Math.max(0, newTick)),
    velocity: Math.max(40, Math.min(127, newVelocity)),
  };
}

// =============================================================================
// BASS GENERATOR CLASS
// =============================================================================

export class BassGenerator {
  /**
   * Generate bass line for a chord
   */
  generate(options: BassGeneratorOptions): NoteEvent[] {
    const {
      chord,
      nextChord,
      pattern = "root-fifth",
      beats = 4,
      swing = 0,
      humanize: humanizeAmount = 0.3,
      energy = 0.7,
      octave = 2,
      startTick = 0,
    } = options;

    switch (pattern) {
      case "walking":
        return this.walkingBass(chord, nextChord, beats, octave, startTick, swing, humanizeAmount, energy);
      case "root-fifth":
        return this.rootFifth(chord, beats, octave, startTick, swing, humanizeAmount, energy);
      case "octave-pulse":
        return this.octavePulse(chord, beats, octave, startTick, swing, humanizeAmount, energy);
      case "syncopated":
        return this.syncopated(chord, beats, octave, startTick, swing, humanizeAmount, energy);
      default:
        return this.rootFifth(chord, beats, octave, startTick, swing, humanizeAmount, energy);
    }
  }

  /**
   * Walking bass - jazz style with chromatic approaches
   */
  private walkingBass(
    chord: string,
    nextChord: string | undefined,
    beats: number,
    octave: number,
    startTick: number,
    swing: number,
    humanizeAmount: number,
    energy: number
  ): NoteEvent[] {
    const events: NoteEvent[] = [];
    const root = getRoot(chord);
    const third = getThird(chord);
    const fifth = getFifth(chord);
    const seventh = getSeventh(chord);

    // Build scale tones to use
    const scaleTones = [root, third, fifth];
    if (seventh) scaleTones.push(seventh);

    for (let beat = 0; beat < beats; beat++) {
      let note: string;
      const isLastBeat = beat === beats - 1;

      if (beat === 0) {
        // Always root on beat 1
        note = root;
      } else if (isLastBeat && nextChord) {
        // Chromatic approach to next root
        const nextRoot = getRoot(nextChord);
        const fromBelow = Math.random() > 0.5;
        note = getChromaticApproach(nextRoot, fromBelow);
      } else if (beat === 2 && beats >= 4) {
        // Fifth on beat 3 (if we have 4 beats)
        note = fifth;
      } else {
        // Random scale tone or passing tone
        if (Math.random() > 0.3) {
          note = scaleTones[Math.floor(Math.random() * scaleTones.length)];
        } else {
          // Chromatic passing tone
          const target = scaleTones[Math.floor(Math.random() * scaleTones.length)];
          note = getChromaticApproach(target, Math.random() > 0.5);
        }
      }

      const tick = startTick + beat * TICKS_PER_BEAT;
      const baseVelocity = beat === 0 ? 90 : 70 + Math.round(energy * 20);
      const isOffbeat = beat % 2 === 1;

      const { tick: humanizedTick, velocity } = humanize(
        tick, baseVelocity, humanizeAmount, swing, isOffbeat
      );

      events.push({
        startTick: humanizedTick,
        durationTicks: NOTE_DURATIONS.quarter - 40, // Slightly detached
        pitch: noteToMidi(note, octave),
        velocity,
      });
    }

    return events;
  }

  /**
   * Root-fifth pattern - classic boom-chick
   */
  private rootFifth(
    chord: string,
    beats: number,
    octave: number,
    startTick: number,
    swing: number,
    humanizeAmount: number,
    energy: number
  ): NoteEvent[] {
    const events: NoteEvent[] = [];
    const root = getRoot(chord);
    const fifth = getFifth(chord);

    for (let beat = 0; beat < beats; beat++) {
      const isRoot = beat % 2 === 0;
      const note = isRoot ? root : fifth;
      const tick = startTick + beat * TICKS_PER_BEAT;
      const baseVelocity = isRoot ? 85 + Math.round(energy * 20) : 65 + Math.round(energy * 15);

      const { tick: humanizedTick, velocity } = humanize(
        tick, baseVelocity, humanizeAmount, swing, !isRoot
      );

      events.push({
        startTick: humanizedTick,
        durationTicks: isRoot ? NOTE_DURATIONS.quarter : NOTE_DURATIONS.eighth,
        pitch: noteToMidi(note, octave),
        velocity,
      });
    }

    return events;
  }

  /**
   * Octave pulse - driving EDM style
   */
  private octavePulse(
    chord: string,
    beats: number,
    octave: number,
    startTick: number,
    swing: number,
    humanizeAmount: number,
    energy: number
  ): NoteEvent[] {
    const events: NoteEvent[] = [];
    const root = getRoot(chord);
    const stepsPerBeat = energy > 0.7 ? 4 : 2; // 16ths at high energy, 8ths otherwise

    for (let beat = 0; beat < beats; beat++) {
      for (let step = 0; step < stepsPerBeat; step++) {
        const tick = startTick + beat * TICKS_PER_BEAT + step * (TICKS_PER_BEAT / stepsPerBeat);
        const isDownbeat = step === 0;
        const useHighOctave = step % 2 === 1 && energy > 0.5;

        const baseVelocity = isDownbeat ? 100 : 70 + Math.round(energy * 25);

        // Less humanization for EDM - tighter groove
        const { tick: humanizedTick, velocity } = humanize(
          tick, baseVelocity, humanizeAmount * 0.3, 0, false
        );

        events.push({
          startTick: humanizedTick,
          durationTicks: TICKS_PER_BEAT / stepsPerBeat - 10,
          pitch: noteToMidi(root, useHighOctave ? octave + 1 : octave),
          velocity,
        });
      }
    }

    return events;
  }

  /**
   * Syncopated bass - funk/breakbeat style
   */
  private syncopated(
    chord: string,
    beats: number,
    octave: number,
    startTick: number,
    swing: number,
    humanizeAmount: number,
    energy: number
  ): NoteEvent[] {
    const events: NoteEvent[] = [];
    const root = getRoot(chord);
    const fifth = getFifth(chord);
    const third = getThird(chord);

    // Syncopated pattern: hit on 1, &-of-2, 4
    // In 16th note grid: 0, 5, 12 (for 4 beats)
    const pattern = [
      { step: 0, note: root, vel: 100, dur: NOTE_DURATIONS.eighth },
      { step: 5, note: fifth, vel: 80, dur: NOTE_DURATIONS.sixteenth },
      { step: 8, note: root, vel: 70, dur: NOTE_DURATIONS.sixteenth },
      { step: 12, note: third, vel: 85, dur: NOTE_DURATIONS.eighth },
      { step: 14, note: root, vel: 75, dur: NOTE_DURATIONS.sixteenth },
    ];

    const ticksPer16th = TICKS_PER_BEAT / 4;
    const totalSteps = beats * 4;

    for (const hit of pattern) {
      if (hit.step >= totalSteps) continue;

      const tick = startTick + hit.step * ticksPer16th;
      const baseVelocity = Math.round(hit.vel * (0.7 + energy * 0.3));

      const { tick: humanizedTick, velocity } = humanize(
        tick, baseVelocity, humanizeAmount, swing, hit.step % 2 === 1
      );

      events.push({
        startTick: humanizedTick,
        durationTicks: hit.dur,
        pitch: noteToMidi(hit.note, octave),
        velocity,
      });
    }

    return events;
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/** Generate bass line for a chord */
export function generateBassLine(options: BassGeneratorOptions): NoteEvent[] {
  const generator = new BassGenerator();
  return generator.generate(options);
}

/** Generate bass line for a chord progression */
export function generateBassForProgression(
  chords: string[],
  beatsPerChord: number,
  pattern: PatternHint = "root-fifth",
  options: Partial<BassGeneratorOptions> = {}
): NoteEvent[] {
  const generator = new BassGenerator();
  const events: NoteEvent[] = [];
  let currentTick = options.startTick ?? 0;

  for (let i = 0; i < chords.length; i++) {
    const chord = chords[i];
    const nextChord = chords[i + 1] ?? chords[0]; // Loop to first chord

    const chordEvents = generator.generate({
      ...options,
      chord,
      nextChord,
      pattern,
      beats: beatsPerChord,
      startTick: currentTick,
    });

    events.push(...chordEvents);
    currentTick += beatsPerChord * TICKS_PER_BEAT;
  }

  return events;
}
