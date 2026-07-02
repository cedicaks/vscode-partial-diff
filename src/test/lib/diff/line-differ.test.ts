import LineDiffer from '../../../lib/diff/line-differ';
import * as assert from 'assert';

suite('LineDiffer', () => {
    const differ = new LineDiffer();

    test('it marks identical texts as equal', () => {
        assert.deepEqual(differ.diff('a\nb', 'a\nb'), [
            {type: 'equal', text: 'a'},
            {type: 'equal', text: 'b'}
        ]);
    });

    test('it detects an inserted line', () => {
        assert.deepEqual(differ.diff('a\nc', 'a\nb\nc'), [
            {type: 'equal', text: 'a'},
            {type: 'insert', text: 'b'},
            {type: 'equal', text: 'c'}
        ]);
    });

    test('it detects a deleted line', () => {
        assert.deepEqual(differ.diff('a\nb\nc', 'a\nc'), [
            {type: 'equal', text: 'a'},
            {type: 'delete', text: 'b'},
            {type: 'equal', text: 'c'}
        ]);
    });

    test('it treats lines differing only by line ending (CRLF vs LF) as equal', () => {
        assert.deepEqual(differ.diff('a\r\nb\r\nc', 'a\nb\nc'), [
            {type: 'equal', text: 'a'},
            {type: 'equal', text: 'b'},
            {type: 'equal', text: 'c'}
        ]);
    });

    test('it still detects a real change amongst mixed line endings', () => {
        assert.deepEqual(differ.diff('a\r\nb\r\nc', 'a\nB\nc'), [
            {type: 'equal', text: 'a'},
            {type: 'delete', text: 'b'},
            {type: 'insert', text: 'B'},
            {type: 'equal', text: 'c'}
        ]);
    });

    test('it represents a changed line as a delete followed by an insert', () => {
        assert.deepEqual(differ.diff('a\nb\nc', 'a\nB\nc'), [
            {type: 'equal', text: 'a'},
            {type: 'delete', text: 'b'},
            {type: 'insert', text: 'B'},
            {type: 'equal', text: 'c'}
        ]);
    });
});
