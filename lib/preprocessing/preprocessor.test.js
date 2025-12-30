/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { PreprocessingTokenType } from './preprocessing-token-type.js';
import { Preprocessor } from './preprocessor.js';

async function testStream(input) {
  const p = new Preprocessor();
  async function* inputGen() {
    yield input;
  }
  const tokens = [];
  for await (const token of p.process(inputGen())) {
    tokens.push(token);
  }
  return tokens;
}

describe('Preprocessor', () => {
  it('default state', () => {
    const p = new Preprocessor();
    assert.strictEqual(p.tokenCount, 0);
  });

  it('identifier', async () => {
    const tokens = await testStream('test');
    assert.strictEqual(tokens.length, 2);
    assert.strictEqual(tokens[0].value, 'test');
    assert.strictEqual(tokens[0].type, PreprocessingTokenType.identifier);
    assert.strictEqual(tokens[1].value, '');
    assert.strictEqual(tokens[1].type, PreprocessingTokenType.eof);
  });

  it('whitespace', async () => {
    const tokens = await testStream('make   a\t\t5');
    assert.strictEqual(tokens.length, 6);
    assert.strictEqual(tokens[1].value, '');
    assert.strictEqual(tokens[1].type, PreprocessingTokenType.whitespace);
    assert.strictEqual(tokens[3].value, '');
    assert.strictEqual(tokens[3].type, PreprocessingTokenType.whitespace);
  });

  it('assignment with number', async () => {
    const tokens = await testStream('make a 10');
    assert.strictEqual(tokens.length, 6);
    assert.strictEqual(tokens[0].value, 'make');
    assert.strictEqual(tokens[0].type, PreprocessingTokenType.identifier);

    assert.strictEqual(tokens[1].value, '');
    assert.strictEqual(tokens[1].type, PreprocessingTokenType.whitespace);

    assert.strictEqual(tokens[2].value, 'a');
    assert.strictEqual(tokens[2].type, PreprocessingTokenType.identifier);

    assert.strictEqual(tokens[3].value, '');
    assert.strictEqual(tokens[3].type, PreprocessingTokenType.whitespace);

    assert.strictEqual(tokens[4].value, '10');
    assert.strictEqual(tokens[4].type, PreprocessingTokenType.number);

    assert.strictEqual(tokens[5].value, '');
    assert.strictEqual(tokens[5].type, PreprocessingTokenType.eof);
  });

  it('assignment with string', async () => {
    const tokens = await testStream("make a 'hello'");
    assert.strictEqual(tokens.length, 6);
    assert.strictEqual(tokens[0].value, 'make');
    assert.strictEqual(tokens[0].type, PreprocessingTokenType.identifier);

    assert.strictEqual(tokens[1].value, '');
    assert.strictEqual(tokens[1].type, PreprocessingTokenType.whitespace);

    assert.strictEqual(tokens[2].value, 'a');
    assert.strictEqual(tokens[2].type, PreprocessingTokenType.identifier);

    assert.strictEqual(tokens[3].value, '');
    assert.strictEqual(tokens[3].type, PreprocessingTokenType.whitespace);

    assert.strictEqual(tokens[4].value, "'hello'");
    assert.strictEqual(tokens[4].type, PreprocessingTokenType.string);

    assert.strictEqual(tokens[5].value, '');
    assert.strictEqual(tokens[5].type, PreprocessingTokenType.eof);
  });

  it('linefeed', async () => {
    const tokens = await testStream('make a 1\nmake b 2');
    assert.strictEqual(tokens.length, 12);
    assert.strictEqual(tokens[5].value, '');
    assert.strictEqual(tokens[5].type, PreprocessingTokenType.linefeed);
  });

  it('operator single', async () => {
    const tokens = await testStream('a = a + 1');
    assert.strictEqual(tokens.length, 10);
    assert.strictEqual(tokens[2].value, '=');
    assert.strictEqual(tokens[2].type, PreprocessingTokenType.operator);
    assert.strictEqual(tokens[6].value, '+');
    assert.strictEqual(tokens[6].type, PreprocessingTokenType.operator);
  });

  it('operator double', async () => {
    const tokens = await testStream('as i <= 16');
    assert.strictEqual(tokens.length, 8);
    assert.strictEqual(tokens[4].value, '<=');
    assert.strictEqual(tokens[4].type, PreprocessingTokenType.operator);
  });

  it('unknown', async () => {
    const tokens = await testStream('test $');
    assert.strictEqual(tokens.length, 4);
    assert.strictEqual(tokens[2].value, '$');
    assert.strictEqual(tokens[2].type, PreprocessingTokenType.unknown);
    assert.strictEqual(tokens[3].value, '');
    assert.strictEqual(tokens[3].type, PreprocessingTokenType.eof);
  });

  it('empty input', async () => {
    const tokens = await testStream('');
    assert.strictEqual(tokens.length, 1);
    assert.strictEqual(tokens[0].value, '');
    assert.strictEqual(tokens[0].type, PreprocessingTokenType.eof);
  });

  it('identifier with digits', async () => {
    const tokens = await testStream('var1');
    assert.strictEqual(tokens.length, 2);
    assert.strictEqual(tokens[0].value, 'var1');
    assert.strictEqual(tokens[0].type, PreprocessingTokenType.identifier);
    assert.strictEqual(tokens[1].value, '');
    assert.strictEqual(tokens[1].type, PreprocessingTokenType.eof);
  });

  it('number followed by identifier', async () => {
    const tokens = await testStream('123abc');
    assert.strictEqual(tokens.length, 3);
    assert.strictEqual(tokens[0].value, '123');
    assert.strictEqual(tokens[0].type, PreprocessingTokenType.number);
    assert.strictEqual(tokens[1].value, 'abc');
    assert.strictEqual(tokens[1].type, PreprocessingTokenType.identifier);
    assert.strictEqual(tokens[2].value, '');
    assert.strictEqual(tokens[2].type, PreprocessingTokenType.eof);
  });

  it('number', async () => {
    const tokens = await testStream('123');
    assert.strictEqual(tokens.length, 2);
    assert.strictEqual(tokens[0].value, '123');
    assert.strictEqual(tokens[0].type, PreprocessingTokenType.number);
    assert.strictEqual(tokens[1].value, '');
    assert.strictEqual(tokens[1].type, PreprocessingTokenType.eof);
  });

  it('negative number', async () => {
    const tokens = await testStream('-123');
    assert.strictEqual(tokens.length, 2);
    assert.strictEqual(tokens[0].value, '-123');
    assert.strictEqual(tokens[0].type, PreprocessingTokenType.number);
    assert.strictEqual(tokens[1].value, '');
    assert.strictEqual(tokens[1].type, PreprocessingTokenType.eof);
  });

  it('multiple operators', async () => {
    const tokens = await testStream('a +++ b');
    assert.strictEqual(tokens.length, 6);
    assert.strictEqual(tokens[2].value, '+++');
    assert.strictEqual(tokens[2].type, PreprocessingTokenType.operator);
  });

  it('only whitespace', async () => {
    const tokens = await testStream('   \t  ');
    assert.strictEqual(tokens.length, 2);
    assert.strictEqual(tokens[0].value, '');
    assert.strictEqual(tokens[0].type, PreprocessingTokenType.whitespace);
    assert.strictEqual(tokens[1].value, '');
    assert.strictEqual(tokens[1].type, PreprocessingTokenType.eof);
  });

  it('multiple linefeeds', async () => {
    const tokens = await testStream('a\n\nb');
    assert.strictEqual(tokens.length, 5);
    assert.strictEqual(tokens[1].value, '');
    assert.strictEqual(tokens[1].type, PreprocessingTokenType.linefeed);
    assert.strictEqual(tokens[2].value, '');
    assert.strictEqual(tokens[2].type, PreprocessingTokenType.linefeed);
  });

  it('unclosed string', async () => {
    const tokens = await testStream("'hello");
    assert.strictEqual(tokens.length, 2);
    assert.strictEqual(tokens[0].value, "'hello");
    assert.strictEqual(tokens[0].type, PreprocessingTokenType.string);
    assert.strictEqual(tokens[1].value, '');
    assert.strictEqual(tokens[1].type, PreprocessingTokenType.eof);
  });

  it('string double quote', async () => {
    const tokens = await testStream('"hello"\ntest');
    assert.strictEqual(tokens.length, 4);
    assert.strictEqual(tokens[0].value, '"hello"');
    assert.strictEqual(tokens[0].type, PreprocessingTokenType.string);
    assert.strictEqual(tokens[1].value, '');
    assert.strictEqual(tokens[1].type, PreprocessingTokenType.linefeed);
  });

  it('string single quote', async () => {
    const tokens = await testStream("'hello'\ntest");
    assert.strictEqual(tokens.length, 4);
    assert.strictEqual(tokens[0].value, "'hello'");
    assert.strictEqual(tokens[0].type, PreprocessingTokenType.string);
    assert.strictEqual(tokens[1].value, '');
    assert.strictEqual(tokens[1].type, PreprocessingTokenType.linefeed);
  });

  it('line and column tracking', async () => {
    const tokens = await testStream('a\nb');
    assert.strictEqual(tokens.length, 4);
    // 'a' at line 1, column 1
    assert.strictEqual(tokens[0].value, 'a');
    assert.strictEqual(tokens[0].type, PreprocessingTokenType.identifier);
    assert.strictEqual(tokens[0].line, 1);
    assert.strictEqual(tokens[0].column, 1);
    // linefeed at line 1, column 2
    assert.strictEqual(tokens[1].value, '');
    assert.strictEqual(tokens[1].type, PreprocessingTokenType.linefeed);
    assert.strictEqual(tokens[1].line, 1);
    assert.strictEqual(tokens[1].column, 2);
    // 'b' at line 2, column 1
    assert.strictEqual(tokens[2].value, 'b');
    assert.strictEqual(tokens[2].type, PreprocessingTokenType.identifier);
    assert.strictEqual(tokens[2].line, 2);
    assert.strictEqual(tokens[2].column, 1);
    // eof
    assert.strictEqual(tokens[3].value, '');
    assert.strictEqual(tokens[3].type, PreprocessingTokenType.eof);
  });

  it('line comment', async () => {
    const tokens = await testStream('make x 5\n# This is a comment\nprint x');
    assert.strictEqual(tokens.length, 10);
    assert.strictEqual(tokens[0].value, 'make');
    assert.strictEqual(tokens[0].type, PreprocessingTokenType.identifier);
    assert.strictEqual(tokens[1].value, '');
    assert.strictEqual(tokens[1].type, PreprocessingTokenType.whitespace);
    assert.strictEqual(tokens[2].value, 'x');
    assert.strictEqual(tokens[2].type, PreprocessingTokenType.identifier);
    assert.strictEqual(tokens[3].value, '');
    assert.strictEqual(tokens[3].type, PreprocessingTokenType.whitespace);
    assert.strictEqual(tokens[4].value, '5');
    assert.strictEqual(tokens[4].type, PreprocessingTokenType.number);
    assert.strictEqual(tokens[5].value, '');
    assert.strictEqual(tokens[5].type, PreprocessingTokenType.linefeed);
    assert.strictEqual(tokens[6].value, 'print');
    assert.strictEqual(tokens[6].type, PreprocessingTokenType.identifier);
    // Comment is ignored, no token for it
  });

  it('comment at EOF', async () => {
    const tokens = await testStream('print 1 # end comment');
    assert.strictEqual(tokens.length, 5);
    assert.strictEqual(tokens[0].value, 'print');
    assert.strictEqual(tokens[0].type, PreprocessingTokenType.identifier);
    assert.strictEqual(tokens[1].value, '');
    assert.strictEqual(tokens[1].type, PreprocessingTokenType.whitespace);
    assert.strictEqual(tokens[2].value, '1');
    assert.strictEqual(tokens[2].type, PreprocessingTokenType.number);
    assert.strictEqual(tokens[3].value, '');
    assert.strictEqual(tokens[3].type, PreprocessingTokenType.whitespace);
    // Comment is ignored, no token for it
    assert.strictEqual(tokens[4].value, '');
    assert.strictEqual(tokens[4].type, PreprocessingTokenType.eof);
  });

  it('empty comment', async () => {
    const tokens = await testStream('make x 1\n#\nprint x');
    assert.strictEqual(tokens.length, 10);
    assert.strictEqual(tokens[0].value, 'make');
    assert.strictEqual(tokens[0].type, PreprocessingTokenType.identifier);
    // Comment is ignored
    assert.strictEqual(tokens[6].value, 'print');
    assert.strictEqual(tokens[6].type, PreprocessingTokenType.identifier);
  });
});
