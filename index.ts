import OpenAI from "openai";
import { spawn, execSync, ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as readline from "readline";
import "dotenv/config";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Available music themes */
enum Theme {
  HouseFocus = "house+focus",
  LofiStudy = "lo-fi+study",
  AmbientRelax = "ambient+relax",
  TechnoCode = "techno+code",
  JazzCafe = "jazz+cafe",
}

/** Musical voice/layer type */
enum VoiceType {
  Melody = "melody",
  Bass = "bass",
  Chords = "chords",
  Arpeggio = "arpeggio",
  Percussion = "percussion",
  Pad = "pad",
}

/** Intensity level for dynamic variation */
enum Intensity {
  Low = "low",
  Medium = "medium",
  High = "high",
  Building = "building",
  Dropping = "dropping",
}

/** Section type for musical structure */
enum SectionType {
  Intro = "intro",
  Verse = "verse",
  Chorus = "chorus",
  Bridge = "bridge",
  Breakdown = "breakdown",
  Buildup = "buildup",
  Drop = "drop",
  Outro = "outro",
}

/** Voice configuration for ABC notation */
interface VoiceConfig {
  id: string;
  name: string;
  clef: "treble" | "bass";
  octave: number;
  type: VoiceType;
}

/** Chord progression definition */
interface ChordProgression {
  name: string;
  chords: string[];
  duration: number; // bars per chord
}

/** Complete theme preset configuration */
interface ThemePreset {
  bpm: number;
  key: string;
  meter: string;
  mood: string;
  instruments: string;
  // New rich configuration
  voices: VoiceConfig[];
  progressions: ChordProgression[];
  bassPatterns: string[];
  arpeggioStyles: string[];
  rhythmicElements: string[];
  textures: string[];
  dynamics: string[];
  structureHints: string[];
}

/** Generation context for variation */
interface GenerationContext {
  segmentNumber: number;
  intensity: Intensity;
  section: SectionType;
  variationSeed: number;
  previousChords?: string;
}

/** Playback state */
interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  volume: number;
  currentTrackIdx: number;
}

// =============================================================================
// THEME PRESETS - Rich Musical Configurations
// =============================================================================

const PRESETS: Record<Theme, ThemePreset> = {
  [Theme.HouseFocus]: {
    bpm: 124,
    key: "C",
    meter: "4/4",
    mood: "upbeat, energetic, driving, euphoric",
    instruments: "synth lead, deep bass, punchy kick, crisp hi-hats, claps",
    voices: [
      { id: "1", name: "Lead", clef: "treble", octave: 1, type: VoiceType.Melody },
      { id: "2", name: "Bass", clef: "bass", octave: -1, type: VoiceType.Bass },
      { id: "3", name: "Chords", clef: "treble", octave: 0, type: VoiceType.Chords },
      { id: "4", name: "Arp", clef: "treble", octave: 1, type: VoiceType.Arpeggio },
    ],
    progressions: [
      { name: "classic-house", chords: ["C", "Am", "F", "G"], duration: 2 },
      { name: "uplifting", chords: ["C", "G", "Am", "F"], duration: 2 },
      { name: "driving", chords: ["Am", "F", "C", "G"], duration: 2 },
      { name: "euphoric", chords: ["F", "G", "Am", "C"], duration: 2 },
    ],
    bassPatterns: [
      "pumping eighth notes on root",
      "offbeat syncopated groove",
      "octave jumps with ghost notes",
      "rolling sixteenth note pattern",
    ],
    arpeggioStyles: [
      "rising sixteenth note arpeggios",
      "broken chord pattern up-down",
      "staccato synth stabs on offbeats",
      "filtered sweep arpeggios",
    ],
    rhythmicElements: [
      "four-on-the-floor kick",
      "offbeat hi-hats",
      "clap on 2 and 4",
      "shaker sixteenths",
    ],
    textures: [
      "sidechained pad swells",
      "filtered white noise risers",
      "reverb-drenched stabs",
    ],
    dynamics: ["building energy", "peak euphoria", "tension release", "steady groove"],
    structureHints: ["8-bar phrases", "call and response", "filter sweeps", "breakdowns"],
  },

  [Theme.LofiStudy]: {
    bpm: 85,
    key: "Dm",
    meter: "4/4",
    mood: "nostalgic, warm, chill, hazy, intimate, melancholic",
    instruments: "dusty piano, mellow rhodes, warm bass, vinyl texture, soft drums",
    voices: [
      { id: "1", name: "Piano", clef: "treble", octave: 0, type: VoiceType.Melody },
      { id: "2", name: "Bass", clef: "bass", octave: -1, type: VoiceType.Bass },
      { id: "3", name: "Rhodes", clef: "treble", octave: 0, type: VoiceType.Chords },
      { id: "4", name: "Texture", clef: "treble", octave: 1, type: VoiceType.Pad },
    ],
    progressions: [
      { name: "lofi-classic", chords: ["Dm7", "G7", "Cmaj7", "Am7"], duration: 2 },
      { name: "jazzy", chords: ["Dm9", "Em7", "Fmaj7", "E7"], duration: 2 },
      { name: "sad-vibes", chords: ["Am7", "Dm7", "G7", "Cmaj7"], duration: 2 },
      { name: "chill", chords: ["Fmaj7", "Em7", "Dm7", "Cmaj7"], duration: 2 },
      { name: "neo-soul", chords: ["Dm7", "Dbmaj7", "Cmaj7", "Bm7b5"], duration: 2 },
    ],
    bassPatterns: [
      "lazy walking bass with chromatic approaches",
      "root-fifth groove with ghost notes",
      "syncopated R&B pocket",
      "sparse melodic bass with slides",
    ],
    arpeggioStyles: [
      "gentle broken chords",
      "rhodes tremolo chords",
      "soft piano arpeggios with sustain",
      "music box style high notes",
    ],
    rhythmicElements: [
      "boom-bap drum pattern",
      "lazy swing feel",
      "brushed snare ghost notes",
      "vinyl crackle texture",
    ],
    textures: [
      "tape warble and wow",
      "rain ambience undertone",
      "distant jazz radio sample feel",
      "warm tube saturation",
    ],
    dynamics: ["intimate whisper", "gentle sway", "wistful longing", "cozy warmth"],
    structureHints: ["4-bar loops", "subtle variations", "humanized timing", "imperfect beauty"],
  },

  [Theme.AmbientRelax]: {
    bpm: 70,
    key: "Am",
    meter: "4/4",
    mood: "calm, peaceful, atmospheric, floating, spacious, ethereal",
    instruments: "soft pads, gentle strings, glass bells, deep drones, nature textures",
    voices: [
      { id: "1", name: "Bell", clef: "treble", octave: 2, type: VoiceType.Melody },
      { id: "2", name: "Drone", clef: "bass", octave: -2, type: VoiceType.Bass },
      { id: "3", name: "Pad", clef: "treble", octave: 0, type: VoiceType.Pad },
      { id: "4", name: "Texture", clef: "treble", octave: 1, type: VoiceType.Arpeggio },
    ],
    progressions: [
      { name: "floating", chords: ["Am", "Em", "F", "C"], duration: 4 },
      { name: "ethereal", chords: ["Am", "Fmaj7", "Dm7", "E"], duration: 4 },
      { name: "spacious", chords: ["Am7", "Dm7", "Fmaj7", "Em7"], duration: 4 },
      { name: "meditative", chords: ["Am", "Am/G", "Fmaj7", "E7sus4"], duration: 4 },
    ],
    bassPatterns: [
      "sustained pedal tones",
      "slow-moving drone notes",
      "fifth intervals held long",
      "sub-bass swells",
    ],
    arpeggioStyles: [
      "slow crystalline arpeggios",
      "random bell-like tones",
      "glacial piano notes",
      "wind chime patterns",
    ],
    rhythmicElements: [
      "no percussion, pure ambience",
      "subtle pulse feel",
      "breath-like swells",
    ],
    textures: [
      "shimmering reverb tails",
      "granular pad textures",
      "distant choir voices",
      "nature field recordings",
      "water droplet resonance",
    ],
    dynamics: ["barely there", "slowly evolving", "gentle breathing", "vast emptiness"],
    structureHints: ["long phrases", "slow evolution", "space between notes", "meditative repetition"],
  },

  [Theme.TechnoCode]: {
    bpm: 128,
    key: "Em",
    meter: "4/4",
    mood: "driving, hypnotic, dark, mechanical, relentless, industrial",
    instruments: "acid synth, pounding kick, metallic hi-hats, dark bass, industrial textures",
    voices: [
      { id: "1", name: "Lead", clef: "treble", octave: 1, type: VoiceType.Melody },
      { id: "2", name: "Bass", clef: "bass", octave: -1, type: VoiceType.Bass },
      { id: "3", name: "Acid", clef: "treble", octave: 0, type: VoiceType.Arpeggio },
      { id: "4", name: "Stab", clef: "treble", octave: 0, type: VoiceType.Chords },
    ],
    progressions: [
      { name: "dark-minimal", chords: ["Em", "Em", "Em", "Em"], duration: 4 },
      { name: "tension", chords: ["Em", "D", "C", "B"], duration: 2 },
      { name: "industrial", chords: ["Em", "C", "G", "D"], duration: 2 },
      { name: "hypnotic", chords: ["Em", "Am", "Em", "B"], duration: 2 },
    ],
    bassPatterns: [
      "relentless sixteenth note pulse",
      "syncopated acid bassline",
      "octave-jumping industrial bass",
      "filtered resonant sweeps",
    ],
    arpeggioStyles: [
      "303-style acid sequence",
      "hypnotic repeating pattern",
      "glitchy stuttered arps",
      "ascending tension builder",
    ],
    rhythmicElements: [
      "pounding four-on-floor",
      "mechanical hi-hat patterns",
      "industrial clang percussion",
      "reverse reverb hits",
    ],
    textures: [
      "dark atmospheric sweeps",
      "industrial noise bursts",
      "metallic resonance",
      "dystopian pads",
    ],
    dynamics: ["relentless drive", "building tension", "hypnotic trance", "mechanical precision"],
    structureHints: ["16-bar builds", "minimal variation", "hypnotic repetition", "sudden drops"],
  },

  [Theme.JazzCafe]: {
    bpm: 100,
    key: "F",
    meter: "4/4",
    mood: "smooth, sophisticated, warm, swinging, conversational, intimate",
    instruments: "acoustic piano, upright bass, brushed drums, muted trumpet, warm guitar",
    voices: [
      { id: "1", name: "Piano", clef: "treble", octave: 0, type: VoiceType.Melody },
      { id: "2", name: "Bass", clef: "bass", octave: -1, type: VoiceType.Bass },
      { id: "3", name: "Comping", clef: "treble", octave: 0, type: VoiceType.Chords },
      { id: "4", name: "Counter", clef: "treble", octave: 0, type: VoiceType.Melody },
    ],
    progressions: [
      { name: "ii-V-I", chords: ["Gm7", "C7", "Fmaj7", "Fmaj7"], duration: 2 },
      { name: "rhythm-changes", chords: ["Fmaj7", "Dm7", "Gm7", "C7"], duration: 1 },
      { name: "bossa", chords: ["Fmaj7", "G7", "Gm7", "C7"], duration: 2 },
      { name: "ballad", chords: ["Fmaj7", "Em7b5", "A7", "Dm7"], duration: 2 },
      { name: "blues", chords: ["F7", "Bb7", "F7", "C7"], duration: 2 },
    ],
    bassPatterns: [
      "walking bass with chromatic approaches",
      "two-feel on 1 and 3",
      "bossa nova pattern",
      "jazz waltz feel",
    ],
    arpeggioStyles: [
      "comping rhythms with shell voicings",
      "stride piano left hand",
      "guitar-style chord melody",
      "block chord harmonies",
    ],
    rhythmicElements: [
      "swing feel triplets",
      "brush pattern on snare",
      "ride cymbal jazz pattern",
      "syncopated kicks",
    ],
    textures: [
      "warm room reverb",
      "intimate club ambience",
      "cafe chatter undertone",
    ],
    dynamics: ["conversational interplay", "building solo", "laid-back groove", "intimate whisper"],
    structureHints: ["AABA form", "head-solo-head", "trading fours", "call and response"],
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const CACHE_DIR = path.join(os.homedir(), ".musicforever");

function randomElement<T>(arr: readonly T[]): T {
  if (arr.length === 0) {
    throw new Error("Cannot get random element from empty array");
  }
  // Non-null assertion safe here: we verified length > 0
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getSection(segmentNumber: number): SectionType {
  const sections: SectionType[] = [
    SectionType.Verse,
    SectionType.Verse,
    SectionType.Chorus,
    SectionType.Verse,
    SectionType.Bridge,
    SectionType.Chorus,
    SectionType.Breakdown,
    SectionType.Buildup,
  ];
  // Safe: modulo ensures index is always within bounds
  return sections[segmentNumber % sections.length] ?? SectionType.Verse;
}

function getIntensity(section: SectionType): Intensity {
  const intensityMap: Record<SectionType, Intensity> = {
    [SectionType.Intro]: Intensity.Low,
    [SectionType.Verse]: Intensity.Medium,
    [SectionType.Chorus]: Intensity.High,
    [SectionType.Bridge]: Intensity.Medium,
    [SectionType.Breakdown]: Intensity.Low,
    [SectionType.Buildup]: Intensity.Building,
    [SectionType.Drop]: Intensity.High,
    [SectionType.Outro]: Intensity.Dropping,
  };
  return intensityMap[section];
}

// =============================================================================
// PROMPT BUILDER - Creates Rich Multi-Voice Prompts
// =============================================================================

function buildGenerationPrompt(
  theme: Theme,
  preset: ThemePreset,
  context: GenerationContext
): string {
  const progression = randomElement(preset.progressions);
  const bassPattern = randomElement(preset.bassPatterns);
  const arpeggioStyle = randomElement(preset.arpeggioStyles);
  const texture = randomElement(preset.textures);
  const dynamic = randomElement(preset.dynamics);
  const structure = randomElement(preset.structureHints);

  const voiceInstructions = preset.voices
    .map((v) => {
      switch (v.type) {
        case VoiceType.Melody:
          return `V:${v.id} (${v.name}) - Write an expressive melodic line, use passing tones, neighbor notes, and rhythmic variety. Octave ${v.octave > 0 ? "+" : ""}${v.octave}.`;
        case VoiceType.Bass:
          return `V:${v.id} (${v.name}) - ${bassPattern}. Follow the chord roots with ${context.intensity === Intensity.High ? "active movement" : "steady foundation"}. Clef: ${v.clef}.`;
        case VoiceType.Chords:
          return `V:${v.id} (${v.name}) - Comp with chord voicings, rhythmic stabs or sustained pads depending on intensity. Current vibe: ${dynamic}.`;
        case VoiceType.Arpeggio:
          return `V:${v.id} (${v.name}) - ${arpeggioStyle}. Add movement and sparkle to the texture.`;
        case VoiceType.Pad:
          return `V:${v.id} (${v.name}) - Sustained background harmonies, ${texture}. Keep it atmospheric.`;
        case VoiceType.Percussion:
          return `V:${v.id} (${v.name}) - Rhythmic pattern using ${randomElement(preset.rhythmicElements)}.`;
        default:
          return `V:${v.id} (${v.name}) - Supporting voice.`;
      }
    })
    .join("\n");

  const prompt = `Generate segment ${context.segmentNumber} of infinite ${theme} background music.

=== MUSICAL CONTEXT ===
Theme: ${theme}
Mood: ${preset.mood}
Section: ${context.section} (${context.intensity} intensity)
Variation seed: ${context.variationSeed} (use this to create unique variations)

=== TECHNICAL SPECS ===
Tempo: Q:1/4=${preset.bpm}
Key: K:${preset.key}
Meter: M:${preset.meter}
Length: 32 bars

=== CHORD PROGRESSION ===
Use: ${progression.name} - ${progression.chords.join(" → ")}
(${progression.duration} bars per chord, loop as needed for 32 bars)

=== VOICE ARRANGEMENT ===
Create 4 distinct voices that layer together:
${voiceInstructions}

=== STYLE DIRECTION ===
- Texture: ${texture}
- Feel: ${dynamic}
- Structure: ${structure}
- Rhythmic elements: ${randomElement(preset.rhythmicElements)}

=== ABC NOTATION FORMAT ===
X:${context.segmentNumber}
T:${theme} - Segment ${context.segmentNumber}
M:${preset.meter}
L:1/8
Q:1/4=${preset.bpm}
K:${preset.key}
%%staves {1 2 3 4}
V:1 clef=treble name="${preset.voices[0]?.name || "Voice1"}"
V:2 clef=bass name="${preset.voices[1]?.name || "Voice2"}"
V:3 clef=treble name="${preset.voices[2]?.name || "Voice3"}"
V:4 clef=treble name="${preset.voices[3]?.name || "Voice4"}"

IMPORTANT:
- Write ALL 4 voices with [V:1], [V:2], [V:3], [V:4] markers
- Each voice should have 32 bars of music
- Make voices complement each other harmonically
- Add rests and space - not everything plays all the time
- Use dynamics: vary note density based on ${context.intensity} intensity
- Return ONLY valid ABC notation, no explanations`;

  return prompt;
}

// =============================================================================
// MUSIC GENERATOR CLASS
// =============================================================================

class MusicGenerator {
  private client: OpenAI;
  private preset: ThemePreset;
  private theme: Theme;
  private cacheDir: string;
  private soundfont: string | null;
  private midiFiles: string[] = [];
  private playedIndices: Set<number> = new Set();
  private segmentCount: number = 0;
  private currentProcess: ChildProcess | null = null;
  private isGenerating: boolean = false;
  private startTime: number = Date.now();
  private generationStatus: string = "";
  private cachedCount: number = 0;
  private newCount: number = 0;

  private state: PlaybackState = {
    isPlaying: true,
    isPaused: false,
    volume: 2.0,
    currentTrackIdx: -1,
  };

  constructor(theme: Theme) {
    this.client = new OpenAI();
    this.theme = theme;
    this.preset = PRESETS[theme] ?? PRESETS[Theme.LofiStudy];

    this.cacheDir = path.join(CACHE_DIR, theme.replace(/[^a-z0-9+]/gi, "_"));
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    if (!fs.existsSync(this.cacheDir)) fs.mkdirSync(this.cacheDir, { recursive: true });

    this.soundfont = this.findSoundfont();
    this.loadCachedFiles();
  }

  private loadCachedFiles(): void {
    try {
      const files = fs
        .readdirSync(this.cacheDir)
        .filter((f) => f.endsWith(".mid"))
        .map((f) => path.join(this.cacheDir, f));
      this.midiFiles = files;
      this.cachedCount = files.length;
      this.segmentCount = files.length;
    } catch {
      // Ignore errors
    }
  }

  private getRandomUnplayedTrack(): number {
    const unplayed = this.midiFiles.map((_, i) => i).filter((i) => !this.playedIndices.has(i));

    if (unplayed.length === 0) {
      this.playedIndices.clear();
      return Math.floor(Math.random() * this.midiFiles.length);
    }
    return randomElement(unplayed);
  }

  private findSoundfont(): string | null {
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

  private async generateSegment(): Promise<string | null> {
    this.isGenerating = true;
    this.segmentCount++;

    const context: GenerationContext = {
      segmentNumber: this.segmentCount,
      section: getSection(this.segmentCount),
      intensity: getIntensity(getSection(this.segmentCount)),
      variationSeed: randomInt(1, 1000),
    };

    const prompt = buildGenerationPrompt(this.theme, this.preset, context);

    try {
      const response = await this.client.responses.create({
        model: "gpt-5-nano",
        input: prompt,
        instructions:
          "You are a music composer. Generate valid ABC notation with multiple voices. No markdown, no explanations, just ABC code.",
      });
      this.isGenerating = false;
      return response.output_text?.trim() ?? null;
    } catch (error: unknown) {
      this.isGenerating = false;
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Generation error: ${message}`);
      return null;
    }
  }

  private abcToMidi(abc: string): string | null {
    const timestamp = Date.now();
    const abcFile = path.join(this.cacheDir, `segment_${timestamp}.abc`);
    const midiFile = path.join(this.cacheDir, `segment_${timestamp}.mid`);

    // Clean up markdown code blocks if present
    let cleanAbc = abc.includes("```") ? abc.replace(/```[a-z]*\n?/g, "").trim() : abc;

    fs.writeFileSync(abcFile, cleanAbc);
    try {
      execSync(`abc2midi "${abcFile}" -o "${midiFile}" 2>/dev/null`);
      fs.unlinkSync(abcFile);
      return fs.existsSync(midiFile) ? midiFile : null;
    } catch {
      try {
        fs.unlinkSync(abcFile);
      } catch {
        // Ignore cleanup errors
      }
      return null;
    }
  }

  private playMidi(midiFile: string): void {
    if (!this.soundfont) return;
    if (this.currentProcess) this.currentProcess.kill();

    this.currentProcess = spawn(
      "fluidsynth",
      ["-ni", "-a", "coreaudio", "-g", String(this.state.volume), this.soundfont, midiFile],
      { stdio: ["ignore", "ignore", "ignore"] }
    );
  }

  private formatTime(ms: number): string {
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(remainingSecs).padStart(2, "0")}`;
  }

  private drawUI(): void {
    const elapsed = Date.now() - this.startTime;
    const status = this.state.isPaused ? "PAUSED" : "PLAYING";
    const genStatus = this.isGenerating ? `Generating: ${this.generationStatus}` : "Ready";
    const volPercent = Math.round((this.state.volume / 3) * 100);

    console.clear();
    console.log(`
  ╭────────────────────────────────────────────────╮
  │            MUSIC FOREVER                       │
  │         Multi-Voice AI Generation              │
  ╰────────────────────────────────────────────────╯

  Theme:     ${this.theme}
  Mood:      ${this.preset.mood}

  BPM: ${this.preset.bpm}  |  Key: ${this.preset.key}  |  Meter: ${this.preset.meter}
  Voices:    ${this.preset.voices.map((v) => v.name).join(", ")}

  Time:      ${this.formatTime(elapsed)}
  Volume:    ${volPercent}%  ${"█".repeat(Math.round(volPercent / 10))}${"░".repeat(10 - Math.round(volPercent / 10))}

  Library:   ${this.midiFiles.length} clips (${this.cachedCount} cached + ${this.newCount} new)
  Playing:   Track ${this.state.currentTrackIdx + 1} of ${this.midiFiles.length}

  Status:    ${status}
  AI:        ${genStatus}

  ────────────────────────────────────────────────
  [P] Pause/Play     [N] Next (random)
  [+] Volume up      [-] Volume down
  [R] Restart        [Q] Quit
  ────────────────────────────────────────────────
`);
  }

  private setupKeyboard(): void {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    process.stdin.on("keypress", (_str: string | undefined, key: readline.Key) => {
      if (!key) return;

      switch (key.name) {
        case "p":
          this.state.isPaused = !this.state.isPaused;
          if (this.state.isPaused && this.currentProcess) {
            this.currentProcess.kill();
          } else if (!this.state.isPaused && this.state.currentTrackIdx >= 0) {
            const track = this.midiFiles[this.state.currentTrackIdx];
            if (track) this.playMidi(track);
          }
          break;

        case "n":
          if (this.currentProcess) this.currentProcess.kill();
          this.playNextRandom();
          break;

        case "r":
          if (this.currentProcess) this.currentProcess.kill();
          if (this.state.currentTrackIdx >= 0) {
            const track = this.midiFiles[this.state.currentTrackIdx];
            if (track) this.playMidi(track);
          }
          break;

        case "q":
          this.quit();
          break;

        default:
          if (_str === "+" || _str === "=") {
            this.state.volume = Math.min(3.0, this.state.volume + 0.3);
          } else if (_str === "-" || _str === "_") {
            this.state.volume = Math.max(0.3, this.state.volume - 0.3);
          } else if (key.ctrl && key.name === "c") {
            this.quit();
          }
      }
    });
  }

  private playNextRandom(): void {
    if (this.midiFiles.length === 0) return;
    this.state.currentTrackIdx = this.getRandomUnplayedTrack();
    this.playedIndices.add(this.state.currentTrackIdx);
    const track = this.midiFiles[this.state.currentTrackIdx];
    if (track) this.playMidi(track);
  }

  private quit(): void {
    this.state.isPlaying = false;
    if (this.currentProcess) this.currentProcess.kill();
    console.clear();
    console.log(`\n  Goodbye! (${this.midiFiles.length} clips saved in ${this.cacheDir})\n`);
    process.exit(0);
  }

  private async generateAndConvert(): Promise<void> {
    const section = getSection(this.segmentCount + 1);
    this.generationStatus = `${section} section (clip ${this.midiFiles.length + 1})`;

    const abc = await this.generateSegment();
    if (abc) {
      this.generationStatus = "Converting to MIDI...";
      const midi = this.abcToMidi(abc);
      if (midi) {
        this.midiFiles.push(midi);
        this.newCount++;
      }
    }
  }

  async run(): Promise<void> {
    if (!this.soundfont) {
      console.error("No soundfont found! Run: brew install fluid-synth");
      return;
    }

    this.setupKeyboard();
    console.clear();
    console.log("\n  MUSIC FOREVER - Multi-Voice AI Generation\n");
    console.log(`  Theme: ${this.theme}`);
    console.log(`  Voices: ${this.preset.voices.map((v) => v.name).join(", ")}\n`);

    // Generate initial clips if none cached
    if (this.midiFiles.length === 0) {
      console.log("  No cached clips found. Generating initial clips...\n");
      for (let i = 0; i < 2; i++) {
        const section = getSection(i + 1);
        console.log(`  Generating clip ${i + 1}/2 (${section})...`);
        await this.generateAndConvert();
        console.log(`  Clip ${i + 1} ready!`);
      }
      console.log("\n  Starting playback!\n");
      await new Promise((r) => setTimeout(r, 500));
    }

    this.startTime = Date.now();
    let lastUIUpdate = 0;

    // Background generation loop
    const generateInBackground = async (): Promise<void> => {
      while (this.state.isPlaying) {
        if (!this.isGenerating && !this.state.isPaused) {
          await this.generateAndConvert();
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };
    generateInBackground();

    // Start playback
    this.playNextRandom();

    // Main loop
    while (this.state.isPlaying) {
      const now = Date.now();
      if (now - lastUIUpdate > 300) {
        this.drawUI();
        lastUIUpdate = now;
      }

      // Auto-advance when track ends
      if (!this.state.isPaused && this.midiFiles.length > 0) {
        const processEnded = !this.currentProcess || this.currentProcess.exitCode !== null;
        if (processEnded) {
          this.playNextRandom();
        }
      }

      await new Promise((r) => setTimeout(r, 100));
    }
  }
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

function printHelp(): void {
  console.log(`
  MUSIC FOREVER - Multi-Voice AI Music Generator

  Usage:
    npx tsx index.ts [theme] [options]

  Themes:
    house+focus     Upbeat, energetic (124 BPM) - 4 voices: Lead, Bass, Chords, Arp
    lo-fi+study     Nostalgic, warm, chill (85 BPM) - 4 voices: Piano, Bass, Rhodes, Texture
    ambient+relax   Calm, peaceful (70 BPM) - 4 voices: Bell, Drone, Pad, Texture
    techno+code     Driving, hypnotic (128 BPM) - 4 voices: Lead, Bass, Acid, Stab
    jazz+cafe       Smooth, sophisticated (100 BPM) - 4 voices: Piano, Bass, Comping, Counter

  Options:
    --help, -h      Show this help
    --list          List all available themes with details
    --clear-cache   Clear cached clips for current theme
    --clear-all     Clear all cached clips

  Playback Controls:
    P               Pause / Resume
    N               Next track (skip)
    R               Restart current track
    +               Volume up
    -               Volume down
    Q               Quit

  Examples:
    npx tsx index.ts                    # Default lo-fi+study
    npx tsx index.ts techno+code        # Techno theme
    npx tsx index.ts jazz+cafe          # Jazz cafe vibes

  Requirements:
    - OPENAI_API_KEY in .env file
    - brew install abcmidi fluid-synth
`);
}

function printThemeList(): void {
  console.log("\n  Available Themes:\n");
  Object.entries(PRESETS).forEach(([name, preset]) => {
    console.log(`  ${name.padEnd(16)} ${preset.mood}`);
    console.log(`  ${"".padEnd(16)} ${preset.bpm} BPM | Key: ${preset.key}`);
    console.log(`  ${"".padEnd(16)} Voices: ${preset.voices.map((v) => v.name).join(", ")}`);
    console.log("");
  });
}

function isValidTheme(theme: string): theme is Theme {
  return Object.values(Theme).includes(theme as Theme);
}

// Main execution
const args = process.argv.slice(2);
const themeArg = args.find((a) => !a.startsWith("-")) ?? Theme.LofiStudy;
const theme: Theme = isValidTheme(themeArg) ? themeArg : Theme.LofiStudy;

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

if (args.includes("--list")) {
  printThemeList();
  process.exit(0);
}

if (args.includes("--clear-cache")) {
  const themeDir = path.join(CACHE_DIR, theme.replace(/[^a-z0-9+]/gi, "_"));
  if (fs.existsSync(themeDir)) {
    fs.rmSync(themeDir, { recursive: true });
    console.log(`\n  Cleared cache for theme: ${theme}\n`);
  } else {
    console.log(`\n  No cache found for theme: ${theme}\n`);
  }
  process.exit(0);
}

if (args.includes("--clear-all")) {
  if (fs.existsSync(CACHE_DIR)) {
    fs.rmSync(CACHE_DIR, { recursive: true });
    console.log(`\n  Cleared all cached clips\n`);
  } else {
    console.log(`\n  No cache found\n`);
  }
  process.exit(0);
}

new MusicGenerator(theme).run().catch(console.error);
