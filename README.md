# MusicForever 🎵

AI-powered infinite music generator that creates continuous, evolving musical compositions using OpenAI and music theory.

## Features

- 🎹 **Multiple Genres**: Generate music in various styles including lo-fi, jazz, ambient, techno, and house
- ♾️ **Infinite Generation**: Continuously generates new musical segments that flow seamlessly
- 🎼 **Music Theory**: Built on solid music theory with support for melody, bass, chords, arpeggios, and percussion
- 🎚️ **Dynamic Variation**: Includes intensity levels and musical sections (intro, verse, chorus, bridge, etc.)
- 🎵 **MIDI Output**: Generates MIDI files that can be used with any DAW or music software

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- OpenAI API key

## Installation

1. Clone the repository:
```bash
git clone git@github.com:shivam276/musicforever.git
cd musicforever
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
OPENAI_API_KEY=your_api_key_here
```

## Usage

### Basic Commands

Start the music generator:
```bash
npm start
```

Run in development mode with watch:
```bash
npm run dev
```

### Genre-Specific Commands

Generate specific music styles:
```bash
npm run lofi      # Lo-fi study music
npm run jazz      # Jazz cafe vibes
npm run ambient   # Ambient relaxation
npm run techno    # Techno coding music
npm run house     # House focus music
```

### Utility Commands

```bash
npm run clear     # Clear all generated files
npm run list      # List available themes
```

### Testing

Test individual components:
```bash
npm run test:drums        # Test drum generation
npm run test:drums:list   # List drum patterns
npm run test:segment      # Test segment generation
npm run test:lofi         # Test lo-fi segment
npm run test:jazz         # Test jazz segment
npm run test:house        # Test house segment
npm run test:ambient      # Test ambient segment
```

## Project Structure

```
musicforever/
├── src/
│   ├── audio/
│   │   └── effects/
│   ├── engine/
│   │   ├── orchestrator.ts
│   │   └── theory/
│   │       ├── arpeggio.ts
│   │       ├── bass.ts
│   │       ├── chords.ts
│   │       ├── drums.ts
│   │       ├── humanize.ts
│   │       └── melody.ts
│   ├── llm/
│   │   ├── genres/
│   │   └── prompts.ts
│   ├── midi/
│   │   └── writer.ts
│   └── types/
│       ├── engine.ts
│       ├── index.ts
│       └── producer.ts
├── index.ts
└── package.json
```

## How It Works

1. **Music Theory Engine**: Uses the `tonal` library for music theory calculations
2. **AI Generation**: Leverages OpenAI to generate musical ideas and structures
3. **Orchestration**: Combines multiple musical voices (melody, bass, chords, etc.)
4. **MIDI Generation**: Converts musical data into MIDI files
5. **Continuous Flow**: Generates new segments that connect seamlessly

## Technologies

- **TypeScript**: Type-safe development
- **OpenAI API**: AI-powered music generation
- **Tonal.js**: Music theory library
- **midi-writer-js**: MIDI file generation
- **tsx**: TypeScript execution

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

