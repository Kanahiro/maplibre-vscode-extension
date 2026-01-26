import * as vscode from 'vscode';

export interface StyleJson {
    version: number;
    name?: string;
    sources?: Record<string, SourceSpec>;
    layers?: LayerSpec[];
    sprite?: string;
    glyphs?: string;
    [key: string]: unknown;
}

export interface SourceSpec {
    type: 'vector' | 'raster' | 'raster-dem' | 'geojson' | 'image' | 'video';
    url?: string;
    tiles?: string[];
    data?: unknown;
    [key: string]: unknown;
}

export interface LayerSpec {
    id: string;
    type: 'background' | 'fill' | 'line' | 'symbol' | 'raster' | 'circle' | 'fill-extrusion' | 'heatmap' | 'hillshade';
    source?: string;
    'source-layer'?: string;
    filter?: unknown[];
    layout?: Record<string, unknown>;
    paint?: Record<string, unknown>;
    minzoom?: number;
    maxzoom?: number;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}

type StyleChangeListener = (style: StyleJson | null, editor: vscode.TextEditor | null) => void;

class StyleWatcher {
    private _style: StyleJson | null = null;
    private _editor: vscode.TextEditor | null = null;
    private _listeners: StyleChangeListener[] = [];
    private _disposables: vscode.Disposable[] = [];

    constructor() {
        this._disposables.push(
            vscode.window.onDidChangeActiveTextEditor((editor) => {
                this.updateFromEditor(editor);
            })
        );

        this._disposables.push(
            vscode.workspace.onDidChangeTextDocument((e) => {
                if (this._editor && e.document === this._editor.document) {
                    this.parseStyle();
                }
            })
        );

        // Initialize with current editor
        this.updateFromEditor(vscode.window.activeTextEditor);
    }

    private updateFromEditor(editor: vscode.TextEditor | undefined): void {
        if (editor && this.isStyleJson(editor.document)) {
            this._editor = editor;
            this.parseStyle();
        } else if (!editor || !this.isStyleJson(editor.document)) {
            // Keep the last valid style when switching to non-style files
            // This allows the sidebar to remain populated
        }
    }

    private isStyleJson(document: vscode.TextDocument): boolean {
        return document.languageId === 'json' && document.fileName.endsWith('style.json');
    }

    private parseStyle(): void {
        if (!this._editor) {
            return;
        }

        try {
            const text = this._editor.document.getText();
            const json = JSON.parse(text);
            if (json.version === 8 && (json.sources || json.layers)) {
                this._style = json as StyleJson;
                this.notifyListeners();
            }
        } catch {
            // Invalid JSON, don't update
        }
    }

    private notifyListeners(): void {
        for (const listener of this._listeners) {
            listener(this._style, this._editor);
        }
    }

    get style(): StyleJson | null {
        return this._style;
    }

    get editor(): vscode.TextEditor | null {
        return this._editor;
    }

    onStyleChange(listener: StyleChangeListener): vscode.Disposable {
        this._listeners.push(listener);
        // Immediately call with current state
        listener(this._style, this._editor);
        return new vscode.Disposable(() => {
            const index = this._listeners.indexOf(listener);
            if (index >= 0) {
                this._listeners.splice(index, 1);
            }
        });
    }

    dispose(): void {
        for (const d of this._disposables) {
            d.dispose();
        }
        this._listeners = [];
    }
}

// Singleton instance
let instance: StyleWatcher | null = null;

export function getStyleWatcher(): StyleWatcher {
    if (!instance) {
        instance = new StyleWatcher();
    }
    return instance;
}

export function disposeStyleWatcher(): void {
    if (instance) {
        instance.dispose();
        instance = null;
    }
}
