import * as vscode from 'vscode';
import { getStyleWatcher, SourceSpec } from '../sidebar/index.js';
import { SourceTreeItem } from '../sidebar/sourcesTreeProvider.js';
import { openSourceEditor } from '../panels/sourceEditor.js';

interface SourceTypeOption {
    label: string;
    value: string;
    description: string;
}

const SOURCE_TYPES: SourceTypeOption[] = [
    { label: 'Vector', value: 'vector', description: 'Vector tile source' },
    { label: 'Raster', value: 'raster', description: 'Raster tile source' },
    { label: 'Raster DEM', value: 'raster-dem', description: 'Raster DEM source for terrain' },
    { label: 'GeoJSON', value: 'geojson', description: 'GeoJSON data source' },
    { label: 'Image', value: 'image', description: 'Image source' },
    { label: 'Video', value: 'video', description: 'Video source' },
];

function getDefaultSourceSpec(type: string): SourceSpec {
    const base: SourceSpec = { type: type as SourceSpec['type'] };
    switch (type) {
        case 'vector':
        case 'raster':
            return { ...base, url: '' };
        case 'raster-dem':
            return { ...base, url: '', encoding: 'mapbox' };
        case 'geojson':
            return { ...base, data: { type: 'FeatureCollection', features: [] } };
        case 'image':
            return { ...base, url: '', coordinates: [[0, 0], [1, 0], [1, 1], [0, 1]] };
        case 'video':
            return { ...base, urls: [], coordinates: [[0, 0], [1, 0], [1, 1], [0, 1]] };
        default:
            return base;
    }
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

export async function addSource(): Promise<void> {
    const watcher = getStyleWatcher();
    const editor = watcher.editor;

    if (!editor) {
        vscode.window.showWarningMessage('Please open a style.json file first');
        return;
    }

    // Ask for source type
    const typeSelection = await vscode.window.showQuickPick(
        SOURCE_TYPES.map(t => ({ label: t.label, description: t.description, value: t.value })),
        { placeHolder: 'Select source type' }
    );

    if (!typeSelection) {
        return;
    }

    // Ask for source ID
    const sourceId = await vscode.window.showInputBox({
        prompt: 'Enter source ID',
        placeHolder: 'my-source',
        validateInput: (value) => {
            if (!value || value.trim() === '') {
                return 'Source ID is required';
            }
            const style = watcher.style;
            if (style?.sources && value in style.sources) {
                return 'Source ID already exists';
            }
            return null;
        }
    });

    if (!sourceId) {
        return;
    }

    const sourceSpec = getDefaultSourceSpec(typeSelection.value);

    // For vector/raster, ask for URL
    if (typeSelection.value === 'vector' || typeSelection.value === 'raster' || typeSelection.value === 'raster-dem') {
        const url = await vscode.window.showInputBox({
            prompt: 'Enter TileJSON URL or tile URL template',
            placeHolder: 'https://example.com/tiles.json'
        });
        if (url) {
            sourceSpec.url = url;
        }
    }

    await editJsonFile(editor, (json) => {
        if (!json.sources) {
            json.sources = {};
        }
        (json.sources as Record<string, SourceSpec>)[sourceId] = sourceSpec;
    });

    vscode.window.showInformationMessage(`Source "${sourceId}" added`);
}

export async function deleteSource(item: SourceTreeItem): Promise<void> {
    const watcher = getStyleWatcher();
    const editor = watcher.editor;

    if (!editor) {
        return;
    }

    const confirm = await vscode.window.showWarningMessage(
        `Delete source "${item.sourceId}"? This may break layers that use this source.`,
        { modal: true },
        'Delete'
    );

    if (confirm !== 'Delete') {
        return;
    }

    await editJsonFile(editor, (json) => {
        if (json.sources && typeof json.sources === 'object') {
            delete (json.sources as Record<string, unknown>)[item.sourceId];
        }
    });

    vscode.window.showInformationMessage(`Source "${item.sourceId}" deleted`);
}

export function editSource(item: SourceTreeItem): void {
    openSourceEditor(item.sourceId);
}
