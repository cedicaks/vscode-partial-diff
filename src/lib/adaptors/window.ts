import * as vscode from 'vscode';
import TextEditor from './text-editor';
import {QuickPickItem, SaveDialogOptions, TextEditor as VsTextEditor, Uri} from 'vscode';

export default class WindowAdaptor {
    constructor(private readonly window: typeof vscode.window) {}

    get visibleTextEditors(): TextEditor[] {
        return this.window.visibleTextEditors.map((editor: VsTextEditor) => new TextEditor(editor));
    }

    async showQuickPick<T extends QuickPickItem>(items: T[]): Promise<T[] | undefined> {
        // @ts-ignore
        return this.window.showQuickPick(items, {canPickMany: true});
    }

    async showSaveDialog(options: SaveDialogOptions): Promise<Uri | undefined> {
        return this.window.showSaveDialog(options);
    }

    async showInformationMessage(message: string): Promise<string | undefined> {
        return this.window.showInformationMessage(message);
    }
}
