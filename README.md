# maplibre-vscode-extension

[![GitHub](https://img.shields.io/badge/github-maplibre--vscode--extension-8da0cb?logo=github)](https://github.com/Kanahiro/maplibre-vscode-extension)
[![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/kiguchi.maplibre-vscode-extension)](https://marketplace.visualstudio.com/items?itemName=kiguchi.maplibre-vscode-extension)
[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/kiguchi.maplibre-vscode-extension)](https://marketplace.visualstudio.com/items?itemName=kiguchi.maplibre-vscode-extension)
[![Visual Studio Marketplace Rating](https://img.shields.io/visual-studio-marketplace/stars/kiguchi.maplibre-vscode-extension)](https://marketplace.visualstudio.com/items?itemName=kiguchi.maplibre-vscode-extension)

## Usage

1. Install the extension
2. open `style.json` in editor
3. open command palette and run `MapLibre: Launch Viewer`
    - ![](https://github.com/Kanahiro/maplibre-vscode-extension/blob/main/doc/palette.png?raw=true)
4. Viewer will open in new tab. When edit `style.json`, the viewer will update automatically.
    - ![](https://github.com/Kanahiro/maplibre-vscode-extension/blob/main/doc/viewer.png?raw=true)

### Validation

![](https://github.com/Kanahiro/maplibre-vscode-extension/blob/main/doc/validation.png?raw=true)

- style file named `*style.json` will be validated by JSON schema generated from type of `StyleSpecification`.
- currently there is limitation to validate not nested values only.

### Supported protocols

- `https://path/to/file`
- `pmtiles://https://path/to/file.pmtiles`

```json
"sources": {
    "openmaptiles": {
      "type": "vector",
      "url": "pmtiles://https://tile.openstreetmap.jp/static/planet-20240729.pmtiles"
      // "tiles": ["pmtiles://https://tile.openstreetmap.jp/static/planet-20240729.pmtiles/{z}/{x}/{y}"] is also okay
    },
    "takeshima": {
      "type": "vector",
      "url": "https://tile.openstreetmap.jp/data/takeshima.json"
    }
},
```

## Development

### Prerequisites

- Node.js 20.x or later
- npm
- Visual Studio Code

### Setup

```bash
# Clone the repository
git clone https://github.com/Kanahiro/maplibre-vscode-extension.git
cd maplibre-vscode-extension

# Install dependencies
npm install
```

### Running in Development Mode

1. Open the project in VSCode
2. Press `F5` to launch the Extension Development Host
3. A new VSCode window will open with the extension loaded
4. Open a `*style.json` file and test the extension

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run compile` | Type check, lint, and build |
| `npm run watch` | Watch mode for development |
| `npm run lint` | Run ESLint |
| `npm run check-types` | Run TypeScript type checking |
| `npm run package` | Build for production |
| `npm run build-json-schema` | Generate JSON schema from MapLibre style spec |

### Testing

```bash
npm test
```

This runs the VSCode extension tests using `@vscode/test-electron`.

### Building for Release

```bash
npm run package
```

This creates the production build in the `dist/` directory.

## Attribution

- icon: <https://github.com/maplibre/maplibre.github.io/blob/main/static/img/maplibre%20old%20profile.png>
