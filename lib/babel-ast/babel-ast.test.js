/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import { describe, it } from "node:test";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import assert from "node:assert";

import { Preprocessor } from '../preprocessing/preprocessor.js';
import { Tokenizer } from '../tokenizer/tokenizer.js';
import { BabelAST } from './babel-ast.js';
import { StreamBuffer } from '../util/streamBuffer.js';

async function testStream(input) {
  const preprocessor = new Preprocessor();
  const tokenizer = new Tokenizer();
  const babelAST = new BabelAST();
  const streamBuffer = new StreamBuffer();
  function* test() {yield input;}
  const readableStream = Readable.from(test(), {encoding: 'utf8'});
  await pipeline(
    readableStream,
    preprocessor,
    tokenizer,
    babelAST,
    streamBuffer
  );
  return streamBuffer.buffer;
}

describe('BabelAST', () => {
  it('variableDeclaration', async () => {
    const result = await testStream('make i 1');
    assert.strictEqual(result, 'let i = 1;');
  });
  it('variableDeclaration string', async () => {
    const result = await testStream('make name \'test\'');
    assert.strictEqual(result, 'let name = "test";');
  });
  it('variableAssignment number', async () => {
    const result = await testStream('assign x 42');
    assert.strictEqual(result, 'x = 42;');
  });
  it('variableAssignment string', async () => {
    const result = await testStream('assign msg \'hello\'');
    assert.strictEqual(result, 'msg = "hello";');
  });
  it('variableAssignment identifier', async () => {
    const result = await testStream('assign a b');
    assert.strictEqual(result, 'a = b;');
  });
  it('assignmentExpression', async () => {
    const result = await testStream('x = a + b');
    assert.strictEqual(result, 'x = a + b;');
  });
  it('assignmentExpression with comparison', async () => {
    const result = await testStream('flag = x == 5');
    assert.strictEqual(result, 'flag = x == 5;');
  });
  it('if statement', async () => {
    const result = await testStream('if x == 1\nprint \'yes\'\nendif');
    assert.strictEqual(result, 'if (x == 1) {\n  console.log("yes");\n}');
  });
  it('loop with as/repeat', async () => {
    const result = await testStream('as i < 3\nprint i\ni = i + 1\nrepeat');
    assert.strictEqual(result, 'while (i < 3) {\n  console.log(i);\n  i = i + 1;\n}');
  });
  it('print statement string', async () => {
    const result = await testStream('print \'Hello, World!\'');
    assert.strictEqual(result, 'console.log("Hello, World!");');
  });
  it('print statement identifier', async () => {
    const result = await testStream('print myVar');
    assert.strictEqual(result, 'console.log(myVar);');
  });
  it('print statement number', async () => {
    const result = await testStream('print 42');
    assert.strictEqual(result, 'console.log(42);');
  });
});