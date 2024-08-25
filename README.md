# maplibre-vscode-extension

<https://marketplace.visualstudio.com/items?itemName=kiguchi.maplibre-vscode-extension>

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

## attribution

- icon: <https://github.com/maplibre/maplibre.github.io/blob/main/static/img/maplibre%20old%20profile.png>
