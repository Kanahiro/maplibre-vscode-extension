# maplibre-vscode-extension

<https://marketplace.visualstudio.com/items?itemName=kiguchi.maplibre-vscode-extension>

## Usage

1. Install the extension
2. open `style.json` in editor
3. open command palette and run `MapLibre: Viewer`
    - ![](https://github.com/Kanahiro/maplibre-vscode-extension/blob/main/doc/palette.png?raw=true)
4. Viewer will open in new tab. When edit `style.json`, the viewer will update automatically.
    - ![](https://github.com/Kanahiro/maplibre-vscode-extension/blob/main/doc/viewer.png?raw=true)

### Available protocols

- `http://path/to/file`
- `https://path/to/file`
- `pmtiles://path/to/file.pmtiles`

```json
"sources": {
    "openmaptiles": {
      "type": "vector",
      "url": "pmtiles://https://tile.openstreetmap.jp/static/planet-20240729.pmtiles"
    },
    "takeshima": {
      "type": "vector",
      "url": "https://tile.openstreetmap.jp/data/takeshima.json"
    }
},
```

## attribution

- icon: <https://github.com/maplibre/maplibre.github.io/blob/main/static/img/maplibre%20old%20profile.png>
