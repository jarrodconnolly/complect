/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Preprocessor } from '../preprocessing/preprocessor.js';
import { Tokenizer } from '../tokenizer/tokenizer.js';
import { BabelAST } from './babel-ast.js';

async function testStream(input) {
  const preprocessor = new Preprocessor();
  const tokenizer = new Tokenizer();
  const babelAST = new BabelAST();
  async function* inputGen() {
    yield input;
  }
  const preprocessorGen = preprocessor.process(inputGen());
  const tokenizerGen = tokenizer.process(preprocessorGen);
  const result = await babelAST.process(tokenizerGen);
  return result.code;
}

describe('BabelAST', () => {
  it('variableDeclaration', async () => {
    const result = await testStream('make i 1');
    assert.strictEqual(result, 'let i = 1;');
  });
  it('variableDeclaration string', async () => {
    const result = await testStream("make name 'test'");
    assert.strictEqual(result, 'let name = "test";');
  });
  it('variableAssignment number', async () => {
    const result = await testStream('assign x 42');
    assert.strictEqual(result, 'x = 42;');
  });
  it('variableAssignment string', async () => {
    const result = await testStream("assign msg 'hello'");
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
    const result = await testStream("if x == 1\nprint 'yes'\nendif");
    assert.strictEqual(result, 'if (x == 1) {\n  console.log("yes");\n}');
  });
  it('loop with as/repeat', async () => {
    const result = await testStream('as i < 3\nprint i\ni = i + 1\nrepeat');
    assert.strictEqual(result, 'while (i < 3) {\n  console.log(i);\n  i = i + 1;\n}');
  });
  it('nested if statements', async () => {
    const result = await testStream("if a == 1\nif b == 2\nprint 'nested'\nendif\nendif");
    assert.strictEqual(result, 'if (a == 1) {\n  if (b == 2) {\n    console.log("nested");\n  }\n}');
  });
  it('print statement string', async () => {
    const result = await testStream("print 'Hello, World!'");
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

  it('invalid variable name', async () => {
    try {
      await testStream('make if 1');
      assert.fail('Expected error for invalid variable name');
    } catch (e) {
      assert(e.message.includes('Invalid variableDeclaration'));
    }
  });

  it('invalid assignment target', async () => {
    try {
      await testStream('assign if 1');
      assert.fail('Expected error for invalid assignment target');
    } catch (e) {
      assert(e.message.includes('Invalid variableAssignment'));
    }
  });

  it('invalid literal type', async () => {
    try {
      await testStream('assign x if');
      assert.fail('Expected error for invalid literal type');
    } catch (e) {
      assert(e.message.includes('Unsupported token type for value'));
    }
  });

  it('invalid literal in declaration', async () => {
    try {
      await testStream('make i x');
      assert.fail('Expected error for invalid literal in declaration');
    } catch (e) {
      assert(e.message.includes('Invalid variableDeclaration'));
    }
  });
});
