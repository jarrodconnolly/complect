/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import { describe, it } from "node:test";
import assert from "node:assert";

import { Tokenizer, TokenizerError } from "./tokenizer.js";
import { TokenType } from "./token-type.js";

import { PreprocessingTokenType } from "../preprocessing/preprocessing-token-type.js";
import { PreprocessingToken } from "../preprocessing/preprocessing-token.js";

async function testStream(preprocessingTokens) {
  const t = new Tokenizer();
  async function* preGen() {
    for (const token of preprocessingTokens) {
      yield token;
    }
  }
  const tokens = [];
  for await (const token of t.process(preGen())) {
    tokens.push(token);
  }
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
    assert.strictEqual(tokens[0].line, 0);
    assert.strictEqual(tokens[0].column, 0);
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
    assert.strictEqual(tokens[0].line, 0);
    assert.strictEqual(tokens[0].column, 0);
  });

  it('invalid operator',  async () => {
    try {
      await testStream([
        new PreprocessingToken(PreprocessingTokenType.operator, '$')
      ]);
      assert.fail('Expected exception');
    } catch (e) {
      assert(e instanceof TokenizerError);
      assert.strictEqual(e.message, 'Invalid operator: $ at line 0, column 0');
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
      assert.strictEqual(e.message, 'Invalid number: 4a4 at line 0, column 0');
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

  it('another keyword', async () => {
    const tokens = await testStream([
      new PreprocessingToken(PreprocessingTokenType.identifier, 'if')
    ]);
    assert.strictEqual(tokens.length, 1);
    assert.strictEqual(tokens[0].value, 'if');
    assert.strictEqual(tokens[0].type, TokenType.keyword);
  });

  it('another operator', async () => {
    const tokens = await testStream([
      new PreprocessingToken(PreprocessingTokenType.operator, '==')
    ]);
    assert.strictEqual(tokens.length, 1);
    assert.strictEqual(tokens[0].value, '==');
    assert.strictEqual(tokens[0].type, TokenType.operator);
  });

  it('ignores whitespace', async () => {
    const tokens = await testStream([
      new PreprocessingToken(PreprocessingTokenType.whitespace, '')
    ]);
    assert.strictEqual(tokens.length, 0);
  });

  it('ignores linefeed', async () => {
    const tokens = await testStream([
      new PreprocessingToken(PreprocessingTokenType.linefeed, '')
    ]);
    assert.strictEqual(tokens.length, 0);
  });

  it('ignores eof', async () => {
    const tokens = await testStream([
      new PreprocessingToken(PreprocessingTokenType.eof, '')
    ]);
    assert.strictEqual(tokens.length, 0);
  });

  it('ignores unknown', async () => {
    const tokens = await testStream([
      new PreprocessingToken(PreprocessingTokenType.unknown, '@')
    ]);
    assert.strictEqual(tokens.length, 0);
  });

  it('sequence with ignored tokens', async () => {
    const tokens = await testStream([
      new PreprocessingToken(PreprocessingTokenType.identifier, 'make'),
      new PreprocessingToken(PreprocessingTokenType.whitespace, ''),
      new PreprocessingToken(PreprocessingTokenType.identifier, 'a'),
      new PreprocessingToken(PreprocessingTokenType.whitespace, ''),
      new PreprocessingToken(PreprocessingTokenType.operator, '='),
      new PreprocessingToken(PreprocessingTokenType.linefeed, ''),
      new PreprocessingToken(PreprocessingTokenType.number, '10'),
      new PreprocessingToken(PreprocessingTokenType.eof, '')
    ]);
    assert.strictEqual(tokens.length, 4);
    assert.strictEqual(tokens[0].type, TokenType.keyword);
    assert.strictEqual(tokens[0].value, 'make');
    assert.strictEqual(tokens[1].type, TokenType.identifier);
    assert.strictEqual(tokens[1].value, 'a');
    assert.strictEqual(tokens[2].type, TokenType.operator);
    assert.strictEqual(tokens[2].value, '=');
    assert.strictEqual(tokens[3].type, TokenType.number);
    assert.strictEqual(tokens[3].value, 10);
  });

  it('string with spaces', async () => {
    const tokens = await testStream([
      new PreprocessingToken(PreprocessingTokenType.string, "'hello world'")
    ]);
    assert.strictEqual(tokens.length, 1);
    assert.strictEqual(tokens[0].value, "hello world");
    assert.strictEqual(tokens[0].type, TokenType.string);
  });

  it('large number', async () => {
    const tokens = await testStream([
      new PreprocessingToken(PreprocessingTokenType.number, '123456789')
    ]);
    assert.strictEqual(tokens.length, 1);
    assert.strictEqual(tokens[0].value, 123456789);
    assert.strictEqual(tokens[0].type, TokenType.number);
  });
});