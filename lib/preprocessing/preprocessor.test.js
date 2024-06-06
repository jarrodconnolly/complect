/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * GNU General Public License v3.0 (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)
*/
import { describe, it } from "node:test";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import assert from "node:assert";

import { Preprocessor } from './preprocessor.js';
import { PreprocessingTokenType } from "./preprocessing-token-type.js";

async function testStream(input) {
  const p = new Preprocessor();
  function* test() {yield input;}
  const readableStream = Readable.from(test(), {encoding: 'utf8'});
  const tokens = [];
  await pipeline(
    readableStream,
    p,
    async function (tokenStream) {
      for await (const token of tokenStream) {
        tokens.push(token);
      }
    }
  );
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
    const tokens = await testStream('make a \'hello\'');
    assert.strictEqual(tokens.length, 6);
    assert.strictEqual(tokens[0].value, 'make');
    assert.strictEqual(tokens[0].type, PreprocessingTokenType.identifier);

    assert.strictEqual(tokens[1].value, '');
    assert.strictEqual(tokens[1].type, PreprocessingTokenType.whitespace);

    assert.strictEqual(tokens[2].value, 'a');
    assert.strictEqual(tokens[2].type, PreprocessingTokenType.identifier);

    assert.strictEqual(tokens[3].value, '');
    assert.strictEqual(tokens[3].type, PreprocessingTokenType.whitespace);

    assert.strictEqual(tokens[4].value, '\'hello\'');
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
});
