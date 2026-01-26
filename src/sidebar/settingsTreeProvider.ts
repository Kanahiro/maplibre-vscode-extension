import * as vscode from 'vscode';
import { getStyleWatcher } from './styleWatcher.js';

export class SettingTreeItem extends vscode.TreeItem {
    constructor(
        public readonly settingName: string,
        public readonly settingValue: unknown,
    ) {
        super(settingName, vscode.TreeItemCollapsibleState.None);
        this.description = this.formatValue(settingValue);
        this.tooltip = `${settingName}: ${this.formatValue(settingValue)}`;
        this.contextValue = 'setting';
        this.iconPath = this.getIcon();

        // Enable click to edit
        this.command = {
            command: 'maplibre.editSettings',
            title: 'Edit Settings',
            arguments: [],
        };
    }

    private formatValue(value: unknown): string {
        if (value === undefined || value === null) {
            return '(not set)';
        }
        if (typeof value === 'string') {
            return value.length > 40 ? value.substring(0, 40) + '...' : value;
        }
        if (Array.isArray(value)) {
            return `[${value.join(', ')}]`;
        }
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return String(value);
    }

    private getIcon(): vscode.ThemeIcon {
        switch (this.settingName) {
            case 'name':
                return new vscode.ThemeIcon('tag');
            case 'metadata':
                return new vscode.ThemeIcon('json');
            case 'sprite':
                return new vscode.ThemeIcon('symbol-color');
            case 'glyphs':
                return new vscode.ThemeIcon('symbol-text');
            case 'center':
                return new vscode.ThemeIcon('location');
            case 'zoom':
                return new vscode.ThemeIcon('zoom-in');
            case 'bearing':
                return new vscode.ThemeIcon('compass');
            case 'pitch':
                return new vscode.ThemeIcon('arrow-up');
            case 'light':
                return new vscode.ThemeIcon('lightbulb');
            case 'terrain':
                return new vscode.ThemeIcon('globe');
            case 'fog':
                return new vscode.ThemeIcon('cloud');
            case 'sky':
                return new vscode.ThemeIcon('cloud');
            default:
                return new vscode.ThemeIcon('symbol-property');
        }
    }
}

export class SettingsTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private disposables: vscode.Disposable[] = [];

    // Root-level properties to show (excluding sources and layers)
    private static readonly SETTINGS_PROPERTIES = [
        'name',
        'metadata',
        'sprite',
        'glyphs',
        'center',
        'zoom',
        'bearing',
        'pitch',
        'light',
        'terrain',
        'fog',
        'sky',
        'transition',
    ];

    constructor() {
        const watcher = getStyleWatcher();
        this.disposables.push(
            watcher.onStyleChange(() => {
                this.refresh();
            })
        );
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (element) {
            return Promise.resolve([]);
        }

        return Promise.resolve(this.getSettings());
    }

    private getSettings(): SettingTreeItem[] {
        const watcher = getStyleWatcher();
        const style = watcher.style;

        if (!style) {
            return [];
        }

        const items: SettingTreeItem[] = [];

        for (const prop of SettingsTreeProvider.SETTINGS_PROPERTIES) {
            const value = style[prop];
            // Show even if undefined to indicate it can be set
            items.push(new SettingTreeItem(prop, value));
        }

        return items;
    }

    dispose(): void {
        for (const d of this.disposables) {
            d.dispose();
        }
        this._onDidChangeTreeData.dispose();
    }
}
