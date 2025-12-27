/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import { describe, it } from "node:test";
import assert from "node:assert";

import { BabelTranslator } from "./babel-translator.js";
import { Program, VariableDeclaration, AssignmentExpression, BinaryExpression, IfStatement, WhileStatement, PrintStatement, FunctionDeclaration, ReturnStatement, CallStatement, Identifier, NumericLiteral, StringLiteral } from "../ast/ir-nodes.js";

describe('BabelTranslator', () => {
  it('translates variable declaration with number', () => {
    const ir = new Program([
      new VariableDeclaration('x', new NumericLiteral(5, { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }), { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } })
    ], null);

    const translator = new BabelTranslator();
    const result = translator.translate(ir);

    assert(result.code.trim() === 'let x = 5;');
  });

  it('translates variable declaration with string', () => {
    const ir = new Program([
      new VariableDeclaration('msg', new StringLiteral('hello', { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }), { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } })
    ], null);

    const translator = new BabelTranslator();
    const result = translator.translate(ir);

    assert(result.code.trim() === 'let msg = "hello";');
  });

  it('translates assignment expression', () => {
    const ir = new Program([
      new AssignmentExpression('x', new NumericLiteral(10, { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }), { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } })
    ], null);

    const translator = new BabelTranslator();
    const result = translator.translate(ir);

    assert(result.code.trim() === 'x = 10;');
  });

  it('translates binary expression', () => {
    const ir = new Program([
      new AssignmentExpression('x', new BinaryExpression(
        new Identifier('a', { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }),
        '+',
        new Identifier('b', { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }),
        { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }
      ), { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } })
    ], null);

    const translator = new BabelTranslator();
    const result = translator.translate(ir);

    assert(result.code.trim() === 'x = a + b;');
  });

  it('translates print statement', () => {
    const ir = new Program([
      new PrintStatement(new Identifier('x', { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }), { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } })
    ], null);

    const translator = new BabelTranslator();
    const result = translator.translate(ir);

    assert(result.code.trim() === 'console.log(x);');
  });

  it('translates if statement', () => {
    const ir = new Program([
      new IfStatement(
        new BinaryExpression(
          new Identifier('x', { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }),
          '>',
          new NumericLiteral(0, { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }),
          { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }
        ),
        [
          new PrintStatement(new Identifier('x', { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }), { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } })
        ],
        { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }
      )
    ], null);

    const translator = new BabelTranslator();
    const result = translator.translate(ir);

    assert(result.code.trim() === 'if (x > 0) {\n  console.log(x);\n}');
  });

  it('translates while statement', () => {
    const ir = new Program([
      new WhileStatement(
        new BinaryExpression(
          new Identifier('x', { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }),
          '>',
          new NumericLiteral(0, { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }),
          { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }
        ),
        [
          new AssignmentExpression('x', new BinaryExpression(
            new Identifier('x', { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }),
            '-',
            new NumericLiteral(1, { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }),
            { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }
          ), { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } })
        ],
        { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }
      )
    ], null);

    const translator = new BabelTranslator();
    const result = translator.translate(ir);

    assert(result.code.trim() === 'while (x > 0) {\n  x = x - 1;\n}');
  });

  it('translates complex program', () => {
    const ir = new Program([
      new VariableDeclaration('a', new NumericLiteral(0, { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }), { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }),
      new VariableDeclaration('b', new NumericLiteral(1, { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }), { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }),
      new WhileStatement(
        new BinaryExpression(
          new Identifier('a', { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }),
          '<',
          new NumericLiteral(10, { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }),
          { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }
        ),
        [
          new PrintStatement(new Identifier('a', { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }), { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }),
          new AssignmentExpression('a', new BinaryExpression(
            new Identifier('a', { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }),
            '+',
            new Identifier('b', { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }),
            { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }
          ), { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } })
        ],
        { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }
      )
    ], null);

    const translator = new BabelTranslator();
    const result = translator.translate(ir);

    const expected = `let a = 0;
let b = 1;
while (a < 10) {
  console.log(a);
  a = a + b;
}`;
    assert(result.code.trim() === expected);
  });

  it('translates function declaration', () => {
    const ir = new Program([
      new FunctionDeclaration('add', ['a', 'b'], [
        new ReturnStatement('result', { start: { line: 2, column: 3 }, end: { line: 2, column: 10 } })
      ], { start: { line: 1, column: 1 }, end: { line: 3, column: 1 } })
    ], null);

    const translator = new BabelTranslator();
    const result = translator.translate(ir);

    const expected = `function add(a, b) {
  return result;
}`;
    assert(result.code.trim() === expected);
  });

  it('translates call statement with result', () => {
    const ir = new Program([
      new VariableDeclaration('result', new NumericLiteral(0, { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }), { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }),
      new CallStatement('double', [new Identifier('x', { start: { line: 1, column: 13 }, end: { line: 1, column: 13 } })], 'result', { start: { line: 1, column: 1 }, end: { line: 1, column: 15 } })
    ], null);

    const translator = new BabelTranslator();
    const result = translator.translate(ir);

    const expected = `let result = 0;
result = double(x);`;
    assert(result.code.trim() === expected);
  });

  it('translates call statement void', () => {
    const ir = new Program([
      new CallStatement('print', [new StringLiteral('hello', { start: { line: 1, column: 12 }, end: { line: 1, column: 18 } })], null, { start: { line: 1, column: 1 }, end: { line: 1, column: 18 } })
    ], null);

    const translator = new BabelTranslator();
    const result = translator.translate(ir);

    const expected = `print("hello");`;
    assert(result.code.trim() === expected);
  });
});