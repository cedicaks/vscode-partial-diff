import InlineDiffer, {MAX_INLINE_LINE_LENGTH} from '../../../lib/diff/inline-differ';
import * as assert from 'assert';

suite('InlineDiffer', () => {
    const differ = new InlineDiffer();

    suite('#diff', () => {
        test('it marks identical lines as entirely equal', () => {
            assert.deepEqual(differ.diff('abc', 'abc'), {
                left: [{type: 'equal', text: 'abc'}],
                right: [{type: 'equal', text: 'abc'}]
            });
        });

        test('it marks only the changed characters of a line', () => {
            assert.deepEqual(differ.diff('foo(1);', 'foo(2);'), {
                left: [{type: 'equal', text: 'foo('}, {type: 'diff', text: '1'}, {type: 'equal', text: ');'}],
                right: [{type: 'equal', text: 'foo('}, {type: 'diff', text: '2'}, {type: 'equal', text: ');'}]
            });
        });

        test('it keeps a change together instead of splitting it over a coincidental match', () => {
            assert.deepEqual(differ.diff('value 09', 'value 10'), {
                left: [{type: 'equal', text: 'value '}, {type: 'diff', text: '09'}],
                right: [{type: 'equal', text: 'value '}, {type: 'diff', text: '10'}]
            });
        });

        test('it marks an appended tail as the only difference', () => {
            assert.deepEqual(differ.diff('tambah', 'tambah+'), {
                left: [{type: 'equal', text: 'tambah'}],
                right: [{type: 'equal', text: 'tambah'}, {type: 'diff', text: '+'}]
            });
        });

        test('it marks wholly unrelated lines as entirely different', () => {
            assert.deepEqual(differ.diff('b', 'B'), {
                left: [{type: 'diff', text: 'b'}],
                right: [{type: 'diff', text: 'B'}]
            });
        });

        test('it reports an empty line as having no segments', () => {
            assert.deepEqual(differ.diff('', 'abc'), {
                left: [],
                right: [{type: 'diff', text: 'abc'}]
            });
        });

        test('it gives up on very long lines and reports them as wholly changed', () => {
            const long = 'a'.repeat(MAX_INLINE_LINE_LENGTH + 1);

            assert.deepEqual(differ.diff(long, `${long}b`), {
                left: [{type: 'diff', text: long}],
                right: [{type: 'diff', text: `${long}b`}]
            });
        });
    });

    suite('#areSimilar', () => {
        test('it considers two versions of the same line similar', () => {
            assert.strictEqual(differ.areSimilar('    07 D8 05 20 09', '    07 D8 05 20 10'), true);
        });

        test('it does not consider unrelated lines similar', () => {
            assert.strictEqual(differ.areSimilar('    07 D8 05 20 09', '    tambah'), false);
        });

        test('it ignores shared indentation so that indented lines are not all alike', () => {
            assert.strictEqual(differ.areSimilar('        a = 1', '        return'), false);
        });

        test('it does not consider an empty line similar to anything', () => {
            assert.strictEqual(differ.areSimilar('', ''), false);
        });
    });

    suite('#similarity', () => {
        test('it scores identical lines as 1', () => {
            assert.strictEqual(differ.similarity('abc', 'abc'), 1);
        });

        test('it scores lines with nothing in common as 0', () => {
            assert.strictEqual(differ.similarity('abc', 'xyz'), 0);
        });
    });
});
