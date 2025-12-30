/**
 * Test script: Generate drum pattern → MIDI → FluidSynth playback
 *
 * Run with: npx tsx src/test-drums.ts [pattern] [bars]
 * Example:  npx tsx src/test-drums.ts boom-bap 4
 */

import { execSync, spawn } from "child_process";
import * as path from "path";
import * as os from "os";
import { DrumGenerator, getPatternsForGenre } from "./engine/theory/drums.js";
import { writeEventsToMidi } from "./midi/writer.js";

// =============================================================================
// CONFIG
// =============================================================================

const TEMPO = 90; // BPM - nice lo-fi tempo
const DEFAULT_BARS = 4;
const DEFAULT_PATTERN = "boom-bap";

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

  // Parse args
  const patternName = args[0] ?? DEFAULT_PATTERN;
  const bars = parseInt(args[1] ?? String(DEFAULT_BARS), 10);

  // Handle --list flag
  if (patternName === "--list") {
    console.log("\n  Available drum patterns:\n");
    const generator = new DrumGenerator();
    for (const name of generator.getPatternNames()) {
      console.log(`    ${name}`);
    }
    console.log("\n  Patterns by genre:");
    for (const genre of ["lofi", "house", "techno", "jazz", "ambient"] as const) {
      console.log(`    ${genre}: ${getPatternsForGenre(genre).join(", ")}`);
    }
    console.log("");
    return;
  }

  console.log(`\n  Drum Pattern Test`);
  console.log(`  ─────────────────────────────`);
  console.log(`  Pattern: ${patternName}`);
  console.log(`  Bars:    ${bars}`);
  console.log(`  Tempo:   ${TEMPO} BPM\n`);

  // Check soundfont
  const soundfont = findSoundfont();
  if (!soundfont) {
    console.error("  No soundfont found! Run: brew install fluid-synth");
    process.exit(1);
  }

  // Generate drum pattern
  console.log("  Generating drum pattern...");
  const generator = new DrumGenerator();

  const events = generator.generate({
    patternName,
    bars,
    energy: 0.8,
    humanize: 0.3,
  });

  if (events.length === 0) {
    console.error(`  No events generated! Pattern "${patternName}" might not exist.`);
    console.log("  Run with --list to see available patterns.");
    process.exit(1);
  }

  console.log(`  Generated ${events.length} drum hits`);

  // Write to MIDI
  const outputDir = path.join(os.homedir(), ".musicforever", "test");
  const midiPath = path.join(outputDir, `drums_${patternName}_${Date.now()}.mid`);

  console.log("  Writing MIDI file...");
  writeEventsToMidi(events, midiPath, TEMPO);
  console.log(`  Wrote: ${midiPath}\n`);

  // Play with FluidSynth
  console.log("  Playing with FluidSynth...");
  console.log("  (Press Ctrl+C to stop)\n");

  const player = spawn("fluidsynth", [
    "-ni",           // non-interactive
    "-a", "coreaudio",
    "-g", "2.0",     // gain
    soundfont,
    midiPath,
  ], {
    stdio: "inherit",
  });

  // Handle exit
  player.on("close", (code) => {
    console.log(`\n  Playback finished (code ${code})`);
    process.exit(0);
  });

  // Handle Ctrl+C
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
