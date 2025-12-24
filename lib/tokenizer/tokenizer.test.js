/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import { describe, it } from "node:test";
import assert from "node:assert";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

import { Tokenizer, TokenizerError } from "./tokenizer.js";
import { TokenType } from "./token-type.js";

import { PreprocessingTokenType } from "../preprocessing/preprocessing-token-type.js";
import { PreprocessingToken } from "../preprocessing/preprocessing-token.js";

async function testStream(input) {
  const p = new Tokenizer();
  function* test() {
    for (const preprocessingToken of input) {
      yield preprocessingToken;
    }
  }
  const readableStream = Readable.from(test());
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


describe('Tokenizer', () => {
  it('default state', () => {
    const t = new Tokenizer();
    assert.strictEqual(t.tokenCount, 0);
  });

  it('identifier', async () => {
    const tokens = await testStream([
      new PreprocessingToken(PreprocessingTokenType.identifier, 'test')
    ]);
    assert.strictEqual(tokens.length, 1);
    assert.strictEqual(tokens[0].value, 'test');
    assert.strictEqual(tokens[0].type, TokenType.identifier);
  });

  it('keyword', async () => {
    const tokens = await testStream([
      new PreprocessingToken(PreprocessingTokenType.identifier, 'make')
    ]);
    assert.strictEqual(tokens.length, 1);
    assert.strictEqual(tokens[0].value, 'make');
    assert.strictEqual(tokens[0].type, TokenType.keyword);
  });

  it('operator', async () => {
    const tokens = await testStream([
      new PreprocessingToken(PreprocessingTokenType.operator, '*')
    ]);
    assert.strictEqual(tokens.length, 1);
    assert.strictEqual(tokens[0].value, '*');
    assert.strictEqual(tokens[0].type, TokenType.operator);
  });

  it('invalid operator',  async () => {
    try {
      await testStream([
        new PreprocessingToken(PreprocessingTokenType.operator, '$')
      ]);
      assert.fail('Expected exception');
    } catch (e) {
      assert(e instanceof TokenizerError);
      assert.strictEqual(e.message, 'Invalid operator: $');
    }
    // not sure why this does not catch the exception
    // assert.throws(async () => {
    //   await testStream([new PreprocessingToken(PreprocessingTokenType.operator, '$')])
    // }, TokenizerError);
  });

  it('number', async () => {
    const tokens = await testStream([
      new PreprocessingToken(PreprocessingTokenType.number, '42')
    ]);
    assert.strictEqual(tokens.length, 1);
    assert.strictEqual(tokens[0].value, 42);
    assert.strictEqual(tokens[0].type, TokenType.number);
  });

  it('invalid number',  async () => {
    try {
      await testStream([
        new PreprocessingToken(PreprocessingTokenType.number, '4a4')
      ]);
      assert.fail('Expected exception');
    } catch (e) {
      assert(e instanceof TokenizerError);
      assert.strictEqual(e.message, 'Invalid number: 4a4');
    }
  });

  it('string', async () => {
    const tokens = await testStream([
      new PreprocessingToken(PreprocessingTokenType.string, "'test'")
    ]);
    assert.strictEqual(tokens.length, 1);
    assert.strictEqual(tokens[0].value, "test");
    assert.strictEqual(tokens[0].type, TokenType.string);
  });
});