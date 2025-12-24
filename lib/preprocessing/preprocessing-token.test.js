/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import { describe, it } from "node:test";
import assert from "node:assert";
import { PreprocessingToken } from './preprocessing-token.js';
import { PreprocessingTokenType } from './preprocessing-token-type.js';

describe('PreprocessingToken', () => {
  it('default token', () => {
    const token = new PreprocessingToken();
    assert.strictEqual(token.type, PreprocessingTokenType.none);
    assert.strictEqual(token.value, '');
    assert.strictEqual(token.toString(), 'none ');
  });

  it('identifier', () => {
    const token = new PreprocessingToken();
    token.type = PreprocessingTokenType.identifier;
    token.append('t');
    token.append('e');
    token.append('s');
    token.append('t');

    assert.strictEqual(token.type, PreprocessingTokenType.identifier);
    assert.strictEqual(token.value, 'test');
    assert.strictEqual(token.toString(), 'identifier test');
  });

  it('constructor with type and value', () => {
    const token = new PreprocessingToken(PreprocessingTokenType.number, '42');
    assert.strictEqual(token.type, PreprocessingTokenType.number);
    assert.strictEqual(token.value, '42');
    assert.strictEqual(token.toString(), 'number 42');
  });

  it('number token', () => {
    const token = new PreprocessingToken();
    token.type = PreprocessingTokenType.number;
    token.append('1');
    token.append('2');
    token.append('3');

    assert.strictEqual(token.type, PreprocessingTokenType.number);
    assert.strictEqual(token.value, '123');
    assert.strictEqual(token.toString(), 'number 123');
  });

  it('string token', () => {
    const token = new PreprocessingToken();
    token.type = PreprocessingTokenType.string;
    token.append('"');
    token.append('h');
    token.append('e');
    token.append('l');
    token.append('l');
    token.append('o');
    token.append('"');

    assert.strictEqual(token.type, PreprocessingTokenType.string);
    assert.strictEqual(token.value, '"hello"');
    assert.strictEqual(token.toString(), 'string "hello"');
  });

  it('whitespace token', () => {
    const token = new PreprocessingToken();
    token.type = PreprocessingTokenType.whitespace;
    token.append(' ');
    token.append(' ');

    assert.strictEqual(token.type, PreprocessingTokenType.whitespace);
    assert.strictEqual(token.value, '  ');
    assert.strictEqual(token.toString(), 'whitespace   ');
  });

  it('linefeed token', () => {
    const token = new PreprocessingToken();
    token.type = PreprocessingTokenType.linefeed;
    token.append('\n');

    assert.strictEqual(token.type, PreprocessingTokenType.linefeed);
    assert.strictEqual(token.value, '\n');
    assert.strictEqual(token.toString(), 'linefeed \n');
  });

  it('operator token', () => {
    const token = new PreprocessingToken();
    token.type = PreprocessingTokenType.operator;
    token.append('+');

    assert.strictEqual(token.type, PreprocessingTokenType.operator);
    assert.strictEqual(token.value, '+');
    assert.strictEqual(token.toString(), 'operator +');
  });

  it('eof token', () => {
    const token = new PreprocessingToken();
    token.type = PreprocessingTokenType.eof;

    assert.strictEqual(token.type, PreprocessingTokenType.eof);
    assert.strictEqual(token.value, '');
    assert.strictEqual(token.toString(), 'eof ');
  });

  it('unknown token', () => {
    const token = new PreprocessingToken();
    token.type = PreprocessingTokenType.unknown;
    token.append('@');

    assert.strictEqual(token.type, PreprocessingTokenType.unknown);
    assert.strictEqual(token.value, '@');
    assert.strictEqual(token.toString(), 'unknown @');
  });
});