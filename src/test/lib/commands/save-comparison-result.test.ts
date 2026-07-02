import SaveComparisonResultCommand from '../../../lib/commands/save-comparison-result';
import LastComparisonStore from '../../../lib/last-comparison-store';
import SelectionInfoRegistry from '../../../lib/selection-info-registry';
import ComparisonResultExporter from '../../../lib/comparison-result-exporter';
import WindowAdaptor from '../../../lib/adaptors/window';
import WorkspaceAdaptor from '../../../lib/adaptors/workspace';
import {mock, mockType, verify, when} from '../../helpers';
import * as td from 'testdouble';
import * as vscode from 'vscode';

suite('SaveComparisonResultCommand', () => {

    function createCommand() {
        const lastComparisonStore = mock(LastComparisonStore);
        const selectionInfoRegistry = new SelectionInfoRegistry();
        selectionInfoRegistry.set('reg1', {text: 'TEXT1', fileName: 'FILE1', lineRanges: []});
        selectionInfoRegistry.set('reg2', {text: 'TEXT2', fileName: 'FILE2', lineRanges: []});
        const comparisonResultExporter = mock(ComparisonResultExporter);
        const windowAdaptor = mock(WindowAdaptor);
        const workspaceAdaptor = mock(WorkspaceAdaptor);
        const command = new SaveComparisonResultCommand(
            lastComparisonStore,
            selectionInfoRegistry,
            comparisonResultExporter,
            windowAdaptor,
            workspaceAdaptor
        );
        return {command, deps: {lastComparisonStore, selectionInfoRegistry, comparisonResultExporter, windowAdaptor, workspaceAdaptor}};
    }

    test('it tells the user when there is no comparison to save', async () => {
        const {command, deps} = createCommand();
        when(deps.lastComparisonStore.get()).thenReturn(undefined);

        await command.execute();

        verify(deps.windowAdaptor.showInformationMessage('No comparison to save. Please take a diff first.'));
        verify(deps.windowAdaptor.showSaveDialog(td.matchers.anything()), {times: 0});
    });

    test('it does nothing when the user cancels the save dialog', async () => {
        const {command, deps} = createCommand();
        when(deps.lastComparisonStore.get()).thenReturn({textKey1: 'reg1', textKey2: 'reg2'});
        when(deps.windowAdaptor.showSaveDialog(td.matchers.anything())).thenResolve(undefined);

        await command.execute();

        verify(deps.workspaceAdaptor.writeFile(td.matchers.anything(), td.matchers.anything()), {times: 0});
    });

    test('it exports the comparison as HTML when the chosen file ends with .html', async () => {
        const {command, deps} = createCommand();
        const uri = mockType<vscode.Uri>({fsPath: '/out/result.html'});
        when(deps.lastComparisonStore.get()).thenReturn({textKey1: 'reg1', textKey2: 'reg2'});
        when(deps.windowAdaptor.showSaveDialog(td.matchers.anything())).thenResolve(uri);
        when(deps.comparisonResultExporter.export('html', deps.selectionInfoRegistry.get('reg1'), deps.selectionInfoRegistry.get('reg2')))
            .thenReturn('HTML_CONTENT');

        await command.execute();

        verify(deps.workspaceAdaptor.writeFile(uri, 'HTML_CONTENT'));
    });

    test('it exports the comparison as a unified diff for other extensions', async () => {
        const {command, deps} = createCommand();
        const uri = mockType<vscode.Uri>({fsPath: '/out/result.diff'});
        when(deps.lastComparisonStore.get()).thenReturn({textKey1: 'reg1', textKey2: 'reg2'});
        when(deps.windowAdaptor.showSaveDialog(td.matchers.anything())).thenResolve(uri);
        when(deps.comparisonResultExporter.export('diff', deps.selectionInfoRegistry.get('reg1'), deps.selectionInfoRegistry.get('reg2')))
            .thenReturn('DIFF_CONTENT');

        await command.execute();

        verify(deps.workspaceAdaptor.writeFile(uri, 'DIFF_CONTENT'));
    });
});
