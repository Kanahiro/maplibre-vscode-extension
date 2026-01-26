import * as vscode from 'vscode';
import { getStyleWatcher, LayerSpec } from '../sidebar/index.js';
import { LayerTreeItem } from '../sidebar/layersTreeProvider.js';
import { openLayerEditor } from '../panels/layerEditor.js';

interface LayerTypeOption {
    label: string;
    value: string;
    description: string;
}

const LAYER_TYPES: LayerTypeOption[] = [
    { label: 'Fill', value: 'fill', description: 'Filled polygon' },
    { label: 'Line', value: 'line', description: 'Stroked line' },
    { label: 'Symbol', value: 'symbol', description: 'Icon or text label' },
    { label: 'Circle', value: 'circle', description: 'Filled circle' },
    { label: 'Fill Extrusion', value: 'fill-extrusion', description: '3D extruded polygon' },
    { label: 'Raster', value: 'raster', description: 'Raster map textures' },
    { label: 'Heatmap', value: 'heatmap', description: 'Heatmap visualization' },
    { label: 'Hillshade', value: 'hillshade', description: 'Hillshade from DEM' },
    { label: 'Background', value: 'background', description: 'Map background color' },
];

function getDefaultLayerSpec(type: string, id: string, source?: string): LayerSpec {
    const base: LayerSpec = {
        id,
        type: type as LayerSpec['type'],
    };

    if (type !== 'background' && source) {
        base.source = source;
    }

    // Add default paint properties based on type
    switch (type) {
        case 'fill':
            base.paint = { 'fill-color': '#000000', 'fill-opacity': 0.5 };
            break;
        case 'line':
            base.paint = { 'line-color': '#000000', 'line-width': 1 };
            break;
        case 'circle':
            base.paint = { 'circle-color': '#000000', 'circle-radius': 5 };
            break;
        case 'symbol':
            base.layout = { 'text-field': '' };
            break;
        case 'background':
            base.paint = { 'background-color': '#000000' };
            break;
        case 'fill-extrusion':
            base.paint = { 'fill-extrusion-color': '#000000', 'fill-extrusion-height': 0 };
            break;
        case 'raster':
            base.paint = { 'raster-opacity': 1 };
            break;
        case 'heatmap':
            base.paint = { 'heatmap-weight': 1 };
            break;
        case 'hillshade':
            base.paint = { 'hillshade-exaggeration': 0.5 };
            break;
    }

    return base;
}

async function editJsonFile(
    editor: vscode.TextEditor,
    modify: (json: Record<string, unknown>) => void
): Promise<boolean> {
    const document = editor.document;
    const text = document.getText();

    try {
        const json = JSON.parse(text);
        modify(json);
        const newText = JSON.stringify(json, null, '\t');

        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
        );
        edit.replace(document.uri, fullRange, newText);

        return await vscode.workspace.applyEdit(edit);
    } catch (e) {
        vscode.window.showErrorMessage(`Failed to edit JSON: ${e}`);
        return false;
    }
}

export async function addLayer(): Promise<void> {
    const watcher = getStyleWatcher();
    const editor = watcher.editor;
    const style = watcher.style;

    if (!editor || !style) {
        vscode.window.showWarningMessage('Please open a style.json file first');
        return;
    }

    // Ask for layer type
    const typeSelection = await vscode.window.showQuickPick(
        LAYER_TYPES.map(t => ({ label: t.label, description: t.description, value: t.value })),
        { placeHolder: 'Select layer type' }
    );

    if (!typeSelection) {
        return;
    }

    // Ask for layer ID
    const existingIds = new Set(style.layers?.map(l => l.id) || []);
    const layerId = await vscode.window.showInputBox({
        prompt: 'Enter layer ID',
        placeHolder: 'my-layer',
        validateInput: (value) => {
            if (!value || value.trim() === '') {
                return 'Layer ID is required';
            }
            if (existingIds.has(value)) {
                return 'Layer ID already exists';
            }
            return null;
        }
    });

    if (!layerId) {
        return;
    }

    // Ask for source (if not background)
    let source: string | undefined;
    if (typeSelection.value !== 'background' && style.sources) {
        const sourceIds = Object.keys(style.sources);
        if (sourceIds.length > 0) {
            const sourceSelection = await vscode.window.showQuickPick(
                sourceIds.map(id => ({ label: id, description: style.sources![id].type })),
                { placeHolder: 'Select source (optional)' }
            );
            source = sourceSelection?.label;
        }
    }

    const layerSpec = getDefaultLayerSpec(typeSelection.value, layerId, source);

    // Ask for source-layer if vector source selected
    if (source && style.sources?.[source]?.type === 'vector') {
        const sourceLayer = await vscode.window.showInputBox({
            prompt: 'Enter source-layer name (for vector tiles)',
            placeHolder: 'layer-name'
        });
        if (sourceLayer) {
            layerSpec['source-layer'] = sourceLayer;
        }
    }

    await editJsonFile(editor, (json) => {
        if (!json.layers) {
            json.layers = [];
        }
        (json.layers as LayerSpec[]).push(layerSpec);
    });

    vscode.window.showInformationMessage(`Layer "${layerId}" added`);
}

export async function deleteLayer(item: LayerTreeItem): Promise<void> {
    const watcher = getStyleWatcher();
    const editor = watcher.editor;

    if (!editor) {
        return;
    }

    const confirm = await vscode.window.showWarningMessage(
        `Delete layer "${item.layerId}"?`,
        { modal: true },
        'Delete'
    );

    if (confirm !== 'Delete') {
        return;
    }

    await editJsonFile(editor, (json) => {
        if (json.layers && Array.isArray(json.layers)) {
            json.layers = (json.layers as LayerSpec[]).filter(l => l.id !== item.layerId);
        }
    });

    vscode.window.showInformationMessage(`Layer "${item.layerId}" deleted`);
}

export async function duplicateLayer(item: LayerTreeItem): Promise<void> {
    const watcher = getStyleWatcher();
    const editor = watcher.editor;
    const style = watcher.style;

    if (!editor || !style) {
        return;
    }

    const existingIds = new Set(style.layers?.map(l => l.id) || []);
    let newId = `${item.layerId}-copy`;
    let counter = 1;
    while (existingIds.has(newId)) {
        newId = `${item.layerId}-copy-${counter}`;
        counter++;
    }

    const layerId = await vscode.window.showInputBox({
        prompt: 'Enter new layer ID',
        value: newId,
        validateInput: (value) => {
            if (!value || value.trim() === '') {
                return 'Layer ID is required';
            }
            if (existingIds.has(value)) {
                return 'Layer ID already exists';
            }
            return null;
        }
    });

    if (!layerId) {
        return;
    }

    await editJsonFile(editor, (json) => {
        if (json.layers && Array.isArray(json.layers)) {
            const layers = json.layers as LayerSpec[];
            const sourceLayer = layers.find(l => l.id === item.layerId);
            if (sourceLayer) {
                const newLayer = JSON.parse(JSON.stringify(sourceLayer)) as LayerSpec;
                newLayer.id = layerId;
                // Insert after the original
                const index = layers.findIndex(l => l.id === item.layerId);
                layers.splice(index + 1, 0, newLayer);
            }
        }
    });

    vscode.window.showInformationMessage(`Layer duplicated as "${layerId}"`);
}

export async function moveLayerUp(item: LayerTreeItem): Promise<void> {
    const watcher = getStyleWatcher();
    const editor = watcher.editor;

    if (!editor) {
        return;
    }

    await editJsonFile(editor, (json) => {
        if (json.layers && Array.isArray(json.layers)) {
            const layers = json.layers as LayerSpec[];
            const index = layers.findIndex(l => l.id === item.layerId);
            if (index > 0) {
                // Swap with previous layer (moving up in array = rendered later = on top)
                [layers[index], layers[index - 1]] = [layers[index - 1], layers[index]];
            }
        }
    });
}

export async function moveLayerDown(item: LayerTreeItem): Promise<void> {
    const watcher = getStyleWatcher();
    const editor = watcher.editor;

    if (!editor) {
        return;
    }

    await editJsonFile(editor, (json) => {
        if (json.layers && Array.isArray(json.layers)) {
            const layers = json.layers as LayerSpec[];
            const index = layers.findIndex(l => l.id === item.layerId);
            if (index >= 0 && index < layers.length - 1) {
                // Swap with next layer
                [layers[index], layers[index + 1]] = [layers[index + 1], layers[index]];
            }
        }
    });
}

export function editLayer(item: LayerTreeItem): void {
    openLayerEditor(item.layerId, item.layerIndex);
}

export async function toggleLayerVisibility(item: LayerTreeItem): Promise<void> {
    const watcher = getStyleWatcher();
    const editor = watcher.editor;

    if (!editor) {
        return;
    }

    await editJsonFile(editor, (json) => {
        if (json.layers && Array.isArray(json.layers)) {
            const layers = json.layers as LayerSpec[];
            const layer = layers.find(l => l.id === item.layerId);
            if (layer) {
                if (!layer.layout) {
                    layer.layout = {};
                }
                const currentVisibility = layer.layout.visibility;
                layer.layout.visibility = currentVisibility === 'none' ? 'visible' : 'none';
            }
        }
    });
}
