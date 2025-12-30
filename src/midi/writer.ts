/**
 * MIDI File Writer
 *
 * Uses midi-writer-js to generate proper MIDI files from NoteEvents.
 * This replaces the ABC notation → abc2midi approach.
 */

import MidiWriter from "midi-writer-js";
import * as fs from "fs";
import * as path from "path";
import type { NoteEvent, Track, MusicSegment, TICKS_PER_BEAT } from "../types/engine.js";

// midi-writer-js uses 128 ticks per beat by default, we use 480
const MIDI_WRITER_PPQ = 128;
const OUR_PPQ = 480;

// =============================================================================
// TICK CONVERSION
// =============================================================================

/**
 * Convert our ticks (480 PPQ) to midi-writer-js ticks (128 PPQ)
 */
function convertTicks(ourTicks: number): number {
  return Math.round((ourTicks / OUR_PPQ) * MIDI_WRITER_PPQ);
}

/**
 * Convert our ticks to duration string for midi-writer-js
 * Returns format like "T128" for 128 ticks
 */
function ticksToDuration(ourTicks: number): string {
  const midiTicks = convertTicks(ourTicks);
  return `T${midiTicks}`;
}

// =============================================================================
// NOTE CONVERSION
// =============================================================================

/**
 * Convert pitch (number or string) to midi-writer-js format
 */
function convertPitch(pitch: number | string): string | string[] {
  if (typeof pitch === "number") {
    // MIDI note number - convert to note name
    return midiNumberToNote(pitch);
  }
  // Already a note name like "C4"
  return pitch;
}

/**
 * Convert MIDI note number to note name
 */
function midiNumberToNote(midiNumber: number): string {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midiNumber / 12) - 1;
  const noteIndex = midiNumber % 12;
  return `${noteNames[noteIndex]}${octave}`;
}

// =============================================================================
// MIDI WRITER CLASS
// =============================================================================

export interface MidiWriterOptions {
  /** Output file path */
  outputPath: string;
  /** Tempo in BPM */
  tempo?: number;
  /** Time signature */
  timeSignature?: { beats: number; subdivision: number };
}

export class MidiFileWriter {
  /**
   * Write NoteEvents to a MIDI file
   */
  writeEvents(events: NoteEvent[], options: MidiWriterOptions): string {
    const { outputPath, tempo = 120, timeSignature = { beats: 4, subdivision: 4 } } = options;

    // Create track
    const track = new MidiWriter.Track();

    // Set tempo
    track.setTempo(tempo);

    // Set time signature
    track.setTimeSignature(timeSignature.beats, timeSignature.subdivision);

    // Sort events by start time
    const sortedEvents = [...events].sort((a, b) => a.startTick - b.startTick);

    // Add events with proper wait times
    let currentTick = 0;

    for (const event of sortedEvents) {
      // Calculate wait time from current position
      const waitTicks = Math.max(0, event.startTick - currentTick);

      // Add the note with wait
      const pitch = convertPitch(event.pitch);
      const durationTicks = Math.max(1, event.durationTicks);

      track.addEvent(
        new MidiWriter.NoteEvent({
          pitch: Array.isArray(pitch) ? pitch : [pitch],
          duration: ticksToDuration(durationTicks),
          velocity: Math.round((event.velocity / 127) * 100),
          wait: waitTicks > 0 ? ticksToDuration(waitTicks) : undefined,
        })
      );

      currentTick = event.startTick;
    }

    // Generate and write file
    const writer = new MidiWriter.Writer([track]);
    const midiData = writer.buildFile();

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, Buffer.from(midiData));

    return outputPath;
  }

  /**
   * Write a MusicSegment to a MIDI file (multiple tracks)
   */
  writeSegment(segment: MusicSegment, outputPath: string): string {
    const tracks: MidiWriter.Track[] = [];

    for (const segTrack of segment.tracks) {
      const midiTrack = new MidiWriter.Track();

      // Set tempo on first track
      if (tracks.length === 0) {
        midiTrack.setTempo(segment.tempo);
        midiTrack.setTimeSignature(
          segment.timeSignature.beats,
          segment.timeSignature.subdivision
        );
      }

      // Add track name
      midiTrack.addTrackName(segTrack.id);

      // Set instrument (MIDI program change)
      const program = this.getInstrumentProgram(segTrack.instrument);
      if (program !== null) {
        midiTrack.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: program }));
      }

      // Sort events
      const sortedEvents = [...segTrack.events].sort((a, b) => a.startTick - b.startTick);

      // Group events that start at the same time
      const eventGroups = new Map<number, NoteEvent[]>();
      for (const event of sortedEvents) {
        const existing = eventGroups.get(event.startTick) ?? [];
        existing.push(event);
        eventGroups.set(event.startTick, existing);
      }

      // Add events
      let currentTick = 0;
      const sortedTicks = [...eventGroups.keys()].sort((a, b) => a - b);

      for (const tick of sortedTicks) {
        const events = eventGroups.get(tick)!;
        const waitTicks = tick - currentTick;

        // Add notes (possibly as chord if multiple at same time)
        const pitches = events.map((e) => convertPitch(e.pitch));
        const duration = Math.max(...events.map((e) => e.durationTicks));
        const velocity = Math.round(
          (events.reduce((sum, e) => sum + e.velocity, 0) / events.length / 127) * 100
        );

        midiTrack.addEvent(
          new MidiWriter.NoteEvent({
            pitch: pitches.flat() as string[],
            duration: ticksToDuration(duration),
            velocity,
            wait: ticksToDuration(waitTicks),
          })
        );

        currentTick = tick;
      }

      tracks.push(midiTrack);
    }

    // Generate and write file
    const writer = new MidiWriter.Writer(tracks);
    const midiData = writer.buildFile();

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, Buffer.from(midiData));

    return outputPath;
  }

  /**
   * Get MIDI program number for instrument type
   */
  private getInstrumentProgram(instrument: string): number | null {
    const programs: Record<string, number> = {
      piano: 0,
      "bright-piano": 1,
      "electric-piano": 4,
      rhodes: 4,
      organ: 16,
      "synth-lead": 80,
      "synth-pad": 88,
      "bass-synth": 38,
      "bass-acoustic": 32,
      "bass-electric": 33,
      strings: 48,
      // Drums use channel 10, no program change needed
      drums: null,
    };

    return programs[instrument] ?? null;
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Quick function to write events to MIDI file
 */
export function writeEventsToMidi(
  events: NoteEvent[],
  outputPath: string,
  tempo: number = 120
): string {
  const writer = new MidiFileWriter();
  return writer.writeEvents(events, { outputPath, tempo });
}

/**
 * Quick function to write a segment to MIDI file
 */
export function writeSegmentToMidi(segment: MusicSegment, outputPath: string): string {
  const writer = new MidiFileWriter();
  return writer.writeSegment(segment, outputPath);
}
