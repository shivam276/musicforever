/**
 * LLM Prompts for Music Production
 *
 * The LLM acts as a "producer" - making high-level creative decisions,
 * NOT generating actual notes. It outputs structured JSON commands.
 */

import type { Genre, SectionType } from "../types/producer.js";

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

export const PRODUCER_SYSTEM_PROMPT = `You are a music producer AI. You make HIGH-LEVEL creative decisions about music.

IMPORTANT: You do NOT write notes, melodies, or specific rhythms. Instead, you specify:
- Chord progressions (what harmony to use)
- Energy and tension levels (the feel)
- Which instruments/voices should play
- Pattern hints (walking bass vs pumping, sustained vs stabs)
- Section type (verse, chorus, breakdown, etc.)

A Music Engine will interpret your decisions using music theory rules to generate actual notes.

Your output must be valid JSON matching the ProducerCommand schema.

## ProducerCommand Schema

\`\`\`typescript
{
  "version": "1.0",
  "segmentId": string,      // unique identifier
  "timestamp": number,      // unix timestamp

  "musical": {
    "chordProgression": [
      { "symbol": string, "duration": number, "color"?: string }
      // symbol: chord name like "Dm7", "G7", "Cmaj7"
      // duration: beats (usually 2 or 4)
      // color: "bright" | "dark" | "tense" | "jazzy" | "simple"
    ],
    "key": { "root": string, "mode": string },
    "timeSignature": { "beats": number, "subdivision": number },
    "tempo": { "bpm": number },
    "harmonicRhythm": "slow" | "medium" | "fast"
  },

  "arrangement": {
    "activeVoices": [
      {
        "role": "lead" | "harmony" | "bass" | "rhythm" | "texture" | "arpeggio",
        "activity": "silent" | "sparse" | "normal" | "busy",
        "patternHint"?: string,  // see below
        "register"?: "low" | "mid" | "high"
      }
    ],
    "sectionType": "intro" | "verse" | "chorus" | "bridge" | "breakdown" | "buildup" | "drop" | "outro",
    "density": "sparse" | "light" | "medium" | "full" | "dense"
  },

  "expression": {
    "energy": number,       // 0-1
    "tension": number,      // 0-1
    "dynamics": { "overall": string, "variation": string },
    "humanize": number,     // 0-1
    "swing": number,        // 0-1 (0=straight, 0.33=triplet swing)
    "processing"?: {
      "lofi"?: { "vinylCrackle": number, "tapeWobble": number, "filterCutoff"?: number }
    }
  }
}
\`\`\`

## Pattern Hints by Role

- **bass**: "walking", "root-fifth", "octave-pulse", "syncopated"
- **harmony**: "sustained", "rhythmic-stabs", "shell-voicings"
- **lead**: "lyrical", "riff-based", "call-response", "improvisatory"
- **rhythm**: "boom-bap", "four-on-floor", "breakbeat", "minimal", "brushes"
- **arpeggio**: "up", "down", "up-down", "broken"

## Rules

1. Return ONLY valid JSON - no markdown, no explanations
2. Chord symbols must be valid (e.g., "Cmaj7", "Dm7", "G7", "Am", "F#m7b5")
3. Energy 0-1 affects how busy/intense the music is
4. Tension 0-1 affects dissonance and rhythmic complexity
5. Consider the genre conventions and mood
6. Create musical flow - think about dynamics and contrast`;

// =============================================================================
// GENRE PROMPTS
// =============================================================================

export const GENRE_PROMPTS: Record<Genre, string> = {
  lofi: `## Lo-fi Hip Hop Conventions

- **Chords**: Use jazzy extended chords (7ths, 9ths). Common progressions:
  - ii-V-I (Dm7 → G7 → Cmaj7)
  - i-VI-III-VII (Am7 → Fmaj7 → Cmaj7 → Em7)
  - Chromatic movements (Dm7 → Dbmaj7 → Cmaj7)
- **Key**: Often minor keys or major with minor flavor
- **Tempo**: 70-90 BPM
- **Feel**: Laid-back, nostalgic, warm, slightly melancholic
- **Swing**: Light swing (0.15-0.25)
- **Drums**: boom-bap pattern, sparse
- **Bass**: root-fifth or walking, laid back
- **Processing**: Add lofi processing (vinylCrackle, tapeWobble, filterCutoff around 3000-4000)
- **Energy**: Usually 0.4-0.6 (chill)`,

  jazz: `## Jazz Conventions

- **Chords**: Rich jazz harmony with extensions and alterations:
  - ii-V-I progressions (Dm7 → G7 → Cmaj7)
  - Rhythm changes (Fmaj7 → Dm7 → Gm7 → C7)
  - Tritone substitutions
  - Altered dominants (G7#9, G7b13)
- **Key**: Various, often with modulations
- **Tempo**: 80-140 BPM
- **Feel**: Sophisticated, conversational, swinging
- **Swing**: Strong swing (0.3-0.4)
- **Drums**: brushes or jazz-swing pattern
- **Bass**: walking bass is essential
- **Harmony**: shell-voicings for comping
- **Energy**: Varies, conversations between instruments`,

  house: `## House Music Conventions

- **Chords**: Simple, uplifting progressions:
  - I-V-vi-IV (C → G → Am → F)
  - vi-IV-I-V (Am → F → C → G)
  - Minor key anthems
- **Key**: Major keys for uplifting, minor for deeper house
- **Tempo**: 120-130 BPM
- **Feel**: Driving, euphoric, danceable
- **Swing**: None (0) - straight feel
- **Drums**: four-on-floor kick, offbeat hi-hats
- **Bass**: octave-pulse or syncopated, punchy
- **Energy**: Usually 0.7-0.9 (high energy)
- **Build sections**: Use breakdown → buildup → drop structure`,

  techno: `## Techno Conventions

- **Chords**: Minimal, often single chord or drone:
  - Minor keys dominate
  - Suspended chords for tension
  - Static harmony is fine
- **Key**: Minor keys (Em, Am, Dm)
- **Tempo**: 125-140 BPM
- **Feel**: Hypnotic, dark, mechanical, relentless
- **Swing**: None (0) - very straight
- **Drums**: minimal or techno-driving pattern
- **Bass**: octave-pulse, filtering important
- **Arrangement**: Minimal, evolving slowly
- **Energy**: Can be 0.5 (hypnotic) to 0.9 (peak time)`,

  ambient: `## Ambient Conventions

- **Chords**: Slow, evolving harmony:
  - Suspended chords (Asus4, Csus2)
  - Add9 chords for shimmer
  - Very slow harmonic rhythm
- **Key**: Open, often modal (lydian, mixolydian)
- **Tempo**: 60-80 BPM (or no clear tempo)
- **Feel**: Spacious, ethereal, meditative, floating
- **Swing**: None or very subtle
- **Drums**: Often silent or ambient-pulse (very sparse)
- **Bass**: Drones, sustained notes, very sparse
- **Harmony**: Sustained pads, lots of reverb implied
- **Energy**: Low (0.2-0.4)
- **Processing**: Heavy reverb/delay implied`,
};

// =============================================================================
// CONTEXT PROMPTS
// =============================================================================

export interface ProductionContext {
  segmentNumber: number;
  previousChord?: string;
  previousSection?: SectionType;
  energyTrend?: "increasing" | "decreasing" | "steady";
  moodGoal?: string;
}

export function buildProductionPrompt(
  genre: Genre,
  context: ProductionContext
): string {
  const { segmentNumber, previousChord, previousSection, energyTrend, moodGoal } = context;

  let contextSection = `## Current Context
- Segment number: ${segmentNumber}`;

  if (previousChord) {
    contextSection += `\n- Previous chord: ${previousChord} (maintain harmonic flow)`;
  }

  if (previousSection) {
    contextSection += `\n- Previous section: ${previousSection}`;
  }

  if (energyTrend) {
    contextSection += `\n- Energy trend: ${energyTrend}`;
  }

  if (moodGoal) {
    contextSection += `\n- Mood goal: ${moodGoal}`;
  }

  // Suggest section progression
  let sectionSuggestion = "";
  if (segmentNumber === 1) {
    sectionSuggestion = "This is the first segment - consider starting with an intro or verse.";
  } else if (segmentNumber % 4 === 0) {
    sectionSuggestion = "Consider a chorus or high-energy section here.";
  } else if (segmentNumber % 8 === 6) {
    sectionSuggestion = "Consider a breakdown or bridge for contrast.";
  }

  return `Generate segment ${segmentNumber} for ${genre} music.

${GENRE_PROMPTS[genre]}

${contextSection}

${sectionSuggestion}

Create a ProducerCommand JSON that:
1. Fits the ${genre} genre conventions
2. Maintains musical flow from the previous segment
3. Creates interesting but appropriate variation
4. Balances all active voices

Return ONLY valid JSON, no explanations.`;
}

// =============================================================================
// RESPONSE PARSING
// =============================================================================

/**
 * Extract JSON from LLM response (handles markdown code blocks)
 */
export function extractJSON(response: string): string {
  // Remove markdown code blocks
  let cleaned = response.trim();

  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }

  return cleaned.trim();
}
