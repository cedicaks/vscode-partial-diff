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
        test('it renders an HTML document with colour-coded rows', () => {
            const result = renderer.toHtml('TITLE', 'FILE1', 'FILE2', ops);

            assert.ok(result.startsWith('<!DOCTYPE html>'));
            assert.ok(result.includes('<title>TITLE</title>'));
            assert.ok(result.includes('<tr class="delete">'));
            assert.ok(result.includes('<tr class="insert">'));
            assert.ok(result.includes('<td class="content">b</td>'));
        });

        test('it escapes HTML special characters in the content', () => {
            const result = renderer.toHtml('TITLE', 'F1', 'F2', [{type: 'equal', text: '<a> & "b"'}]);

            assert.ok(result.includes('&lt;a&gt; &amp; &quot;b&quot;'));
        });
    });
});
