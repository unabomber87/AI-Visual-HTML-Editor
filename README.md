# AI Visual HTML Editor

A VSCode extension for visually editing HTML/CSS using AI from a live preview.

## Features

- **Live Preview** - Display your HTML file in a VSCode webview
- **Element Picker** - Click on any element to select it
- **Dual Highlight System** - Visual feedback with two overlays:
  - **Blue (#007acc)**: Currently selected element (locked, moves only on click/scroll)
  - **Green (#28a745)**: Hover preview for selection
- **AI Modification** - Describe desired changes and AI generates appropriate CSS/HTML
- **HTML Modification** - Add elements, modify content, set attributes
- **Undo/Redo** - Easily revert changes with the Undo button in toolbar

## Installation

1. Clone the project
2. Install dependencies: `npm install`
3. Compile the project: `npm run compile`
4. Press F5 to launch the extension in VSCode

## Quick Start

### 1. Start Preview

1. Open an HTML file in VSCode
2. Press `Ctrl+Alt+E` or run command "AI Visual Editor: Start Preview"
3. The preview opens in a webview panel

### 2. Select an Element

1. In the preview, click the **"🎯 Pick"** button to activate the picker
2. The cursor becomes a crosshair
3. Hover over elements - they are highlighted in green
4. Click on the desired element - it becomes selected (blue highlight)

### 3. Modify with AI

1. A sidebar opens with element information
2. Enter your instruction in the text field:
   - Example: "center this element"
   - Example: "add a margin of 20px"
   - Example: "change color to blue"
   - Example: "add a shadow"
   - Example: "add an image logo"
3. Click "Apply Changes" or press `Ctrl+Enter`
4. AI generates the CSS/HTML modifications
5. Click "Confirm" to apply or "Cancel" to revert

### 4. Undo a Change

- Press `Ctrl+Shift+Z` or click the "↶ Undo" button in the toolbar

## Keyboard Shortcuts

| Command | Shortcut |
|---------|----------|
| Start Preview | `Ctrl+Alt+E` |
| Toggle Picker | `Ctrl+Shift+P` |
| Refresh Preview | `Ctrl+Alt+R` |
| Undo Last Change | `Ctrl+Shift+Z` |
| Apply Changes | `Ctrl+Enter` |

## Supported AI Providers

### Groq (Primary - Tested)

**Currently the only tested and working provider.**

- Free and generous (500 requests/minute)
- Very fast response time (<500ms)
- Supports Llama, Mixtral models
- No credit card required

**Configuration:**
```json
{
  "provider": "groq",
  "model": "llama-3.1-70b-versatile",
  "apiKey": "YOUR_GROQ_API_KEY"
}
```

### Other Providers (Not Yet Tested)

| Service | Type | Status |
|---------|------|--------|
| OpenAI | Cloud | Not tested yet |
| Anthropic (Claude) | Cloud | Not tested yet |
| Ollama | Local | Not tested yet |

> **Note:** The extension supports multiple AI providers, but only Groq has been tested and confirmed working. Other providers (OpenAI, Anthropic, Ollama) are implemented but not yet tested. Feel free to contribute by testing and reporting issues!

## Configuration

### Setting API Keys

Run these commands from the Command Palette (`Ctrl+Shift+P`):

- `AI Visual Editor: Set Groq API Key`
- `AI Visual Editor: Set OpenAI API Key`
- `AI Visual Editor: Set Anthropic API Key`
- `AI Visual Editor: Configure Ollama`

### VSCode Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `aiVisualEditor.aiProvider` | AI provider (mock, groq, ollama, openai, anthropic) | mock |
| `aiVisualEditor.groqModel` | Groq model (llama-3.1-70b-versatile, mixtral-8x7b-32768) | llama-3.1-70b-versatile |
| `aiVisualEditor.ollamaModel` | Ollama model | llama3.2 |
| `aiVisualEditor.ollamaUrl` | Ollama server URL | http://localhost:11434 |
| `aiVisualEditor.previewPort` | Preview server port | 3000 |

## AI Integration

### How It Works

1. User clicks an element in the preview
2. Webview sends `element-clicked` message to extension
3. Extension displays sidebar with element info
4. User enters an instruction
5. Instruction + element data is sent to AI
6. AI returns CSS/HTML modifications
7. Extension applies modifications via WorkspaceEdit API
8. Preview is refreshed

### Example Instructions

| User Instruction | Generated CSS |
|------------------|---------------|
| "center this element" | display: flex; justify-content: center; align-items: center; |
| "make it bigger" | width: 200px; height: 200px; |
| "add margin" | margin: 20px; |
| "change color to blue" | background-color: #007bff; |
| "make it rounded" | border-radius: 8px; |
| "add shadow" | box-shadow: 0 4px 6px rgba(0,0,0,0.1); |
| "center text" | text-align: center; |
| "hide it" | display: none; |

### HTML Modification Types

| Instruction | Change Type | Example |
|-------------|-------------|---------|
| "add amazon logo" | append | `<img src="...">` added at end |
| "add at beginning" | prepend | `<img src="...">` added at start |
| "replace content" | replace | Content replaced |
| "add src=..." | setAttribute | Attribute added/modified |

## Architecture

```
src/
├── extension/
│   ├── main.ts                 # Extension entry point
│   ├── commands/
│   │   ├── index.ts           # Command registration
│   │   └── configCommands.ts # API key configuration
│   ├── webview/
│   │   ├── webviewManager.ts  # Preview webview management
│   │   └── sidebarManager.ts  # Sidebar for prompts
│   ├── ai/
│   │   └── aiService.ts       # AI service integration
│   ├── editor/
│   │   ├── cssApplier.ts      # CSS modification
│   │   └── htmlApplier.ts     # HTML modification
│   └── utils/
│       └── config.ts          # Configuration service
└── shared/
    └── types.ts               # Shared types
```

## Communication Flow

```
User Click
    |
    v
+---------------+
| Webview       |
| (Pick element)|
+-------+-------+
        | element-clicked
        v
+---------------+
| Extension     |
| (Handle click)|
+-------+-------+
        | Show sidebar
        v
+---------------+
| Sidebar       |
| (User enters  |
|  instruction) |
+-------+-------+
        | prompt-submitted
        v
+---------------+
| Extension     |
| (Call AI)    |
+-------+-------+
        | getSuggestion()
        v
+---------------+
| AI Provider   |
| (Groq/Ollama/ |
|  OpenAI/Claude)|
+-------+-------+
        | JSON response
        v
+---------------+
| CSS/HTML Applier|
| (Apply changes)|
+-------+-------+
        | Refresh preview
        v
+---------------+
| Webview       |
| (Show result) |
+---------------+
```

## Dual Highlight System

The system uses two overlay highlights with distinct roles:

| Highlight | Color | Role | Behavior |
|-----------|-------|------|----------|
| **Selected** | Blue (#007acc) | Currently modified element | Locked, moves only on click or scroll |
| **Picker** | Green (#28a745) | Hover preview | Follows mouse, enables selection |

### User Flow

1. User clicks "Select Element" in toolbar → picker (green) becomes active
2. User hovers over an element → green highlight follows cursor
3. User clicks an element → blue highlight moves to that element
4. Sidebar opens for modification → picker stays active for new selection

## Toolbar

The toolbar is fixed at the top of the preview with the following buttons:

| Button | Function |
|--------|----------|
| 🎯 Pick / ✕ Stop | Toggle element selection mode |
| 🔄 Refresh | Reload the preview |
| ↶ Undo | Undo last change |

## Troubleshooting

### Preview doesn't display
- Make sure you have an HTML file open
- Check the debug console (Help > Toggle Developer Tools)

### Picker doesn't work
- Click the "🎯 Pick" button to activate the picker
- Button should show "✕ Stop" and cursor should be a crosshair

### Modifications not applied
- Check that the CSS file is writable
- Try undoing and reapplying the modification
- Use elements with unique IDs for better targeting

### Selector issues
- Use elements with unique `id` attributes for precise targeting
- Clear instructions: "change text to [exact text]" instead of "change text"
- Check debug logs for AI responses

## Known Limitations

### Selector Issues
- Selectors with pseudo-classes (:nth-child, :first-child, etc.) may not work
- Very long selectors with deep DOM paths may fail
- Solution: Use elements with unique IDs

### AI Response Truncation
- AI may truncate replacement text
- Solution: Use shorter instructions or increase max_tokens

## Development

### Commands

```bash
npm run compile    # Compile TypeScript project
npm run watch      # Compile in watch mode (auto-compilation)
```

### Files

- [AI Integration Documentation](docs/AI_INTEGRATION.md)
- [API Key Configuration](docs/API_KEY_CONFIG.md)
- [Dual Highlight System](docs/dual-highlight-system.md)
- [HTML Modification System](docs/html-modification-system.md)
- [Toolbar Guide](docs/TOOLBAR_GUIDE.md)

## License

MIT
