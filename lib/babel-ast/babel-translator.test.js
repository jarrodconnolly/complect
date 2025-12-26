/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import { describe, it } from "node:test";
import assert from "node:assert";

import { BabelTranslator } from "./babel-translator.js";
import { Program, VariableDeclaration, AssignmentExpression, BinaryExpression, IfStatement, WhileStatement, PrintStatement, Identifier, NumericLiteral, StringLiteral } from "../ast/ir-nodes.js";

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
});