/**
 * Types for the LLM Producer layer
 * The LLM outputs these structured commands, NOT actual notes
 */

// =============================================================================
// MUSICAL PARAMETERS
// =============================================================================

/** Note name (C, D, E, F, G, A, B with optional # or b) */
export type NoteName = string;

/** Musical mode */
export type Mode =
  | "major"
  | "minor"
  | "dorian"
  | "mixolydian"
  | "lydian"
  | "phrygian"
  | "locrian";

/** How often chords change */
export type HarmonicRhythm = "slow" | "medium" | "fast" | "irregular";

/** Chord color/character hints */
export type ChordColor =
  | "bright"    // major 7ths, add9
  | "dark"      // minor 7ths, sus4
  | "tense"     // dominant 7ths, altered
  | "open"      // quartal voicings, power chords
  | "jazzy"     // extensions, alterations
  | "simple";   // triads only

/** Single chord in a progression */
export interface ChordSpec {
  /** Chord symbol: "Cmaj7", "Dm7", "G7", etc. */
  symbol: string;
  /** Duration in beats */
  duration: number;
  /** Optional voicing hint */
  color?: ChordColor;
}

/** Key signature */
export interface KeySignature {
  root: NoteName;
  mode: Mode;
}

/** Tempo settings */
export interface TempoSpec {
  bpm: number;
  variation?: "steady" | "subtle" | "expressive";
}

/** All musical parameters */
export interface MusicalParameters {
  chordProgression: ChordSpec[];
  key: KeySignature;
  timeSignature: { beats: number; subdivision: number };
  tempo: TempoSpec;
  harmonicRhythm: HarmonicRhythm;
}

// =============================================================================
// ARRANGEMENT PARAMETERS
// =============================================================================

/** Voice/instrument role */
export type VoiceRole =
  | "lead"      // melody
  | "harmony"   // chords/pads
  | "bass"      // bass line
  | "rhythm"    // drums/percussion
  | "texture"   // pads, ambience
  | "arpeggio"; // arpeggiated patterns

/** Pattern hints for each voice type */
export type PatternHint =
  // Bass patterns
  | "walking" | "root-fifth" | "octave-pulse" | "syncopated"
  // Chord patterns
  | "sustained" | "rhythmic-stabs" | "arpeggiated" | "shell-voicings"
  // Melody patterns
  | "lyrical" | "riff-based" | "call-response" | "improvisatory"
  // Drum patterns
  | "four-on-floor" | "boom-bap" | "breakbeat" | "minimal" | "brushes";

/** Activity level for a voice */
export type ActivityLevel = "silent" | "sparse" | "normal" | "busy";

/** Register preference */
export type Register = "low" | "mid" | "high";

/** Section type in song structure */
export type SectionType =
  | "intro" | "verse" | "chorus" | "bridge"
  | "breakdown" | "buildup" | "drop" | "outro";

/** Density of arrangement */
export type Density = "sparse" | "light" | "medium" | "full" | "dense";

/** Voice assignment from LLM */
export interface VoiceAssignment {
  role: VoiceRole;
  activity: ActivityLevel;
  patternHint?: PatternHint;
  register?: Register;
}

/** Call and response patterns */
export interface InterplaySpec {
  type: "call-response" | "unison" | "counterpoint";
  voices: [VoiceRole, VoiceRole];
}

/** All arrangement parameters */
export interface ArrangementParameters {
  activeVoices: VoiceAssignment[];
  sectionType: SectionType;
  density: Density;
  interplay?: InterplaySpec;
}

// =============================================================================
// EXPRESSION PARAMETERS
// =============================================================================

/** Dynamic marking */
export type Dynamic = "pp" | "p" | "mp" | "mf" | "f" | "ff";

/** Dynamic variation type */
export type DynamicVariation = "static" | "breathing" | "building" | "falling";

/** Lo-fi specific processing */
export interface LofiProcessing {
  vinylCrackle: number;     // 0-1
  tapeWobble: number;       // 0-1
  bitDepth?: number;        // 8-16
  filterCutoff?: number;    // Hz for lowpass
}

/** Space/reverb effects */
export interface SpaceProcessing {
  reverb: number;           // 0-1
  delay: number;            // 0-1
  stereoWidth: number;      // 0-1
}

/** Color/EQ effects */
export interface ColorProcessing {
  warmth: number;           // 0-1 (saturation)
  brightness: number;       // 0-1 (high shelf)
  presence: number;         // 0-1 (mid boost)
}

/** All processing hints */
export interface ProcessingHints {
  lofi?: LofiProcessing;
  space?: SpaceProcessing;
  color?: ColorProcessing;
}

/** All expression parameters */
export interface ExpressionParameters {
  /** Overall energy level 0-1 */
  energy: number;
  /** Tension level 0-1 (affects dissonance, rhythmic complexity) */
  tension: number;
  /** Dynamics */
  dynamics: {
    overall: Dynamic;
    variation: DynamicVariation;
  };
  /** Humanization amount 0-1 */
  humanize: number;
  /** Swing feel 0-1 (0 = straight, 0.5 = triplet swing) */
  swing: number;
  /** Genre-specific processing hints */
  processing?: ProcessingHints;
}

// =============================================================================
// TRANSITION PARAMETERS
// =============================================================================

/** Transition type between segments */
export type TransitionType =
  | "immediate"
  | "crossfade"
  | "filter-sweep"
  | "breakdown"
  | "buildup";

/** Transition intensity */
export type TransitionIntensity = "subtle" | "moderate" | "dramatic";

/** Transition parameters */
export interface TransitionParameters {
  type: TransitionType;
  duration: number;         // in beats
  intensity?: TransitionIntensity;
}

// =============================================================================
// MAIN PRODUCER COMMAND
// =============================================================================

/**
 * The main command structure that LLM outputs
 * This is the contract between LLM Producer and Music Engine
 */
export interface ProducerCommand {
  version: "1.0";
  segmentId: string;
  timestamp: number;

  /** Core musical parameters */
  musical: MusicalParameters;

  /** Arrangement decisions */
  arrangement: ArrangementParameters;

  /** Expression and dynamics */
  expression: ExpressionParameters;

  /** Optional transition to next segment */
  transition?: TransitionParameters;
}

// =============================================================================
// GENRE TYPE
// =============================================================================

/** Supported genres */
export type Genre =
  | "lofi"
  | "ambient"
  | "house"
  | "techno"
  | "jazz";
