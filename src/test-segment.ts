/**
 * Test script: Generate full music segment → MIDI → FluidSynth
 *
 * Run with: npx tsx src/test-segment.ts [genre]
 * Example:  npx tsx src/test-segment.ts lofi
 */

import { execSync, spawn } from "child_process";
import * as path from "path";
import * as os from "os";
import { MusicEngineOrchestrator, createTestCommand } from "./engine/orchestrator.js";
import { writeSegmentToMidi } from "./midi/writer.js";
import type { Genre } from "./types/producer.js";

// =============================================================================
// GENRE PRESETS
// =============================================================================

const GENRE_PRESETS: Record<Genre, {
  chords: string[];
  bpm: number;
  key: string;
  mode: string;
  energy: number;
  swing: number;
}> = {
  lofi: {
    chords: ["Dm7", "G7", "Cmaj7", "Am7"],
    bpm: 85,
    key: "C",
    mode: "major",
    energy: 0.5,
    swing: 0.2,
  },
  jazz: {
    chords: ["Fmaj7", "Em7", "Dm7", "Cmaj7"],
    bpm: 100,
    key: "C",
    mode: "major",
    energy: 0.6,
    swing: 0.33,
  },
  house: {
    chords: ["Am", "F", "C", "G"],
    bpm: 124,
    key: "A",
    mode: "minor",
    energy: 0.8,
    swing: 0,
  },
  techno: {
    chords: ["Em", "Em", "Em", "Em"],
    bpm: 128,
    key: "E",
    mode: "minor",
    energy: 0.9,
    swing: 0,
  },
  ambient: {
    chords: ["Am7", "Fmaj7", "Cmaj7", "Em7"],
    bpm: 70,
    key: "A",
    mode: "minor",
    energy: 0.3,
    swing: 0,
  },
};

// =============================================================================
// FIND SOUNDFONT
// =============================================================================

function findSoundfont(): string | null {
  try {
    const result = execSync(
      `ls /opt/homebrew/Cellar/fluid-synth/*/share/fluid-synth/sf2/*.sf2 2>/dev/null | head -1`,
      { encoding: "utf-8" }
    ).trim();
    return result || null;
  } catch {
    return null;
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const genreArg = (args[0] ?? "lofi") as Genre;
  const genre: Genre = GENRE_PRESETS[genreArg] ? genreArg : "lofi";
  const preset = GENRE_PRESETS[genre];

  console.log(`
  Full Segment Test
  ─────────────────────────────
  Genre:   ${genre}
  Chords:  ${preset.chords.join(" → ")}
  Tempo:   ${preset.bpm} BPM
  Energy:  ${preset.energy}
  Swing:   ${preset.swing}
`);

  // Check soundfont
  const soundfont = findSoundfont();
  if (!soundfont) {
    console.error("  No soundfont found! Run: brew install fluid-synth");
    process.exit(1);
  }

  // Create orchestrator
  console.log("  Creating music engine...");
  const orchestrator = new MusicEngineOrchestrator({ genre });

  // Create test command
  const command = createTestCommand(preset.chords, {
    bpm: preset.bpm,
    key: preset.key,
    mode: preset.mode,
    energy: preset.energy,
    voices: ["rhythm", "bass", "harmony", "lead"],
  });

  // Override swing
  command.expression.swing = preset.swing;

  // Generate segment
  console.log("  Generating music segment...");
  const segment = orchestrator.process(command);

  console.log(`  Generated ${segment.tracks.length} tracks:`);
  for (const track of segment.tracks) {
    console.log(`    - ${track.role}: ${track.events.length} events (${track.instrument})`);
  }

  // Write to MIDI
  const outputDir = path.join(os.homedir(), ".musicforever", "test");
  const midiPath = path.join(outputDir, `segment_${genre}_${Date.now()}.mid`);

  console.log("\n  Writing MIDI file...");
  writeSegmentToMidi(segment, midiPath);
  console.log(`  Wrote: ${midiPath}\n`);

  // Play with FluidSynth
  console.log("  Playing with FluidSynth...");
  console.log("  (Press Ctrl+C to stop)\n");

  const player = spawn("fluidsynth", [
    "-ni",
    "-a", "coreaudio",
    "-g", "2.0",
    soundfont,
    midiPath,
  ], {
    stdio: "inherit",
  });

  player.on("close", (code) => {
    console.log(`\n  Playback finished (code ${code})`);
    process.exit(0);
  });

  process.on("SIGINT", () => {
    player.kill();
    console.log("\n  Stopped.");
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
