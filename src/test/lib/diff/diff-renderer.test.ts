import DiffRenderer from '../../../lib/diff/diff-renderer';
import {DiffOp} from '../../../lib/diff/line-differ';
import * as assert from 'assert';

suite('DiffRenderer', () => {
    const renderer = new DiffRenderer();

    const ops: DiffOp[] = [
        {type: 'equal', text: 'a'},
        {type: 'delete', text: 'b'},
        {type: 'insert', text: 'B'},
        {type: 'equal', text: 'c'}
    ];

    // Yields exactly one removed, one added, and one modified row.
    const mixedOps: DiffOp[] = [
        {type: 'equal', text: 'a'},
        {type: 'delete', text: 'b'},
        {type: 'equal', text: 'c'},
        {type: 'insert', text: 'd'},
        {type: 'equal', text: 'e'},
        {type: 'delete', text: 'f'},
        {type: 'insert', text: 'g'},
        {type: 'equal', text: 'h'}
    ];

    suite('#toUnifiedDiff', () => {
        test('it produces a unified diff with header and a hunk', () => {
            const result = renderer.toUnifiedDiff('FILE1', 'FILE2', ops);

            assert.strictEqual(result, [
                '--- FILE1',
                '+++ FILE2',
                '@@ -1,3 +1,3 @@',
                ' a',
                '-b',
                '+B',
                ' c',
                ''
            ].join('\n'));
        });

        test('it produces header only when there are no changes', () => {
            const result = renderer.toUnifiedDiff('FILE1', 'FILE2', [{type: 'equal', text: 'a'}]);

            assert.strictEqual(result, '--- FILE1\n+++ FILE2\n');
        });
    });

    suite('#toHtml', () => {
        test('it renders a side-by-side HTML document with colour-coded rows', () => {
            const result = renderer.toHtml('TITLE', 'FILE1', 'FILE2', ops);

            assert.ok(result.startsWith('<!DOCTYPE html>'));
            assert.ok(result.includes('<title>TITLE</title>'));
            assert.ok(result.includes('<div class="pane-title del">- FILE1</div>'));
            assert.ok(result.includes('<div class="pane-title ins">+ FILE2</div>'));
            assert.ok(result.includes('<tr class="del">'));
            assert.ok(result.includes('<tr class="ins">'));
            assert.ok(result.includes('<td class="content">b</td>'));
        });

        test('it escapes HTML special characters in the content', () => {
            const result = renderer.toHtml('TITLE', 'F1', 'F2', [{type: 'equal', text: '<a> & "b"'}]);

            assert.ok(result.includes('&lt;a&gt; &amp; &quot;b&quot;'));
        });

        test('it pads the opposite pane with an empty filler row for unmatched lines', () => {
            const result = renderer.toHtml('TITLE', 'F1', 'F2', [
                {type: 'equal', text: 'a'},
                {type: 'insert', text: 'b'},
                {type: 'equal', text: 'c'}
            ]);

            assert.ok(result.includes('<tr class="empty">'));
            assert.ok(result.includes('<td class="content">b</td>'));
        });

        test('it renders a single scroll area with a custom overview ruler', () => {
            const result = renderer.toHtml('TITLE', 'F1', 'F2', ops);

            assert.ok(result.includes('<div class="panes">'));
            assert.ok(result.includes('<div class="ruler">'));
            assert.ok(result.includes('<div class="thumb"></div>'));
            assert.ok(/<div class="marker mod" style="top:[\d.]+%"><\/div>/.test(result));
        });

        test('it renders ruler markers colour-coded per change type', () => {
            const result = renderer.toHtml('TITLE', 'F1', 'F2', mixedOps);

            assert.ok(result.includes('class="marker del"'));
            assert.ok(result.includes('class="marker add"'));
            assert.ok(result.includes('class="marker mod"'));
        });

        test('it renders a summary footer with the difference counts', () => {
            const result = renderer.toHtml('TITLE', 'F1', 'F2', mixedOps);

            assert.ok(result.includes('<footer class="summary">'));
            assert.ok(result.includes('<span class="stat added"><b>1</b> added</span>'));
            assert.ok(result.includes('<span class="stat removed"><b>1</b> removed</span>'));
            assert.ok(result.includes('<span class="stat modified"><b>1</b> modified</span>'));
        });
    });

    suite('#summarize', () => {
        test('it counts added, removed, and modified lines', () => {
            assert.deepEqual(renderer.summarize(mixedOps), {added: 1, removed: 1, modified: 1});
        });

        test('it reports zeroes for identical texts', () => {
            assert.deepEqual(renderer.summarize([{type: 'equal', text: 'a'}]), {added: 0, removed: 0, modified: 0});
        });
    });
});
