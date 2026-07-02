import DiffPresenter from '../../lib/diff-presenter';
import {mock, verify} from '../helpers';
import * as assert from 'assert';
import SelectionInfoRegistry from '../../lib/selection-info-registry';
import NormalisationRuleStore from '../../lib/normalisation-rule-store';
import CommandAdaptor from '../../lib/adaptors/command';
import LastComparisonStore from '../../lib/last-comparison-store';

suite('DiffPresenter', () => {
    const selectionInfoRegistry = new SelectionInfoRegistry();
    selectionInfoRegistry.set('TEXT1', {text: 'SELECTED_TEXT1', fileName: 'FILE1', lineRanges: []});
    selectionInfoRegistry.set('TEXT2', {text: 'SELECTED_TEXT2', fileName: 'FILE2', lineRanges: []});

    test('it passes URI of 2 texts to compare', async () => {
        const commandAdaptor = mock(CommandAdaptor);

        const lastComparisonStore = new LastComparisonStore();
        const diffPresenter = new DiffPresenter(
            selectionInfoRegistry,
            mock(NormalisationRuleStore),
            commandAdaptor,
            lastComparisonStore,
            () => new Date('2016-06-15T11:43:00Z')
        );

        await diffPresenter.takeDiff('TEXT1', 'TEXT2');

        verify(commandAdaptor.executeCommand(
            'vscode.diff',
            'partialdiff:text/TEXT1?_ts=1465990980000',
            'partialdiff:text/TEXT2?_ts=1465990980000',
            'FILE1 \u2194 FILE2'
        ));
        assert.deepEqual(lastComparisonStore.get(), {textKey1: 'TEXT1', textKey2: 'TEXT2'});
    });
});
