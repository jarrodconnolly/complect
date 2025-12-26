/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import { describe, it } from "node:test";
import assert from "node:assert";

import { ASTBuilder } from "./ast-builder.js";
import { TokenType } from "../tokenizer/token-type.js";
import { Program, VariableDeclaration, AssignmentExpression, BinaryExpression, IfStatement, WhileStatement, PrintStatement, Identifier, NumericLiteral, StringLiteral } from "./ir-nodes.js";

async function* tokenGenerator(tokens) {
  for (const token of tokens) {
    yield token;
  }
}

describe('ASTBuilder', () => {
  it('variable declaration with number', async () => {
    const tokens = [
      { type: TokenType.keyword, value: 'make', line: 1, column: 1 },
      { type: TokenType.identifier, value: 'x', line: 1, column: 6 },
      { type: TokenType.number, value: '5', line: 1, column: 8 }
    ];

    const builder = new ASTBuilder();
    const ir = await builder.build(tokenGenerator(tokens));

    assert(ir instanceof Program);
    assert(ir.statements.length === 1);
    const stmt = ir.statements[0];
    assert(stmt instanceof VariableDeclaration);
    assert(stmt.identifier === 'x');
    assert(stmt.value instanceof NumericLiteral);
    assert(stmt.value.value === 5);
  });

  it('variable declaration with string', async () => {
    const tokens = [
      { type: TokenType.keyword, value: 'make', line: 1, column: 1 },
      { type: TokenType.identifier, value: 'msg', line: 1, column: 6 },
      { type: TokenType.string, value: 'hello', line: 1, column: 10 }
    ];

    const builder = new ASTBuilder();
    const ir = await builder.build(tokenGenerator(tokens));

    assert(ir.statements.length === 1);
    const stmt = ir.statements[0];
    assert(stmt instanceof VariableDeclaration);
    assert(stmt.identifier === 'msg');
    assert(stmt.value instanceof StringLiteral);
    assert(stmt.value.value === 'hello');
  });

  it('assign statement', async () => {
    const tokens = [
      { type: TokenType.keyword, value: 'assign', line: 1, column: 1 },
      { type: TokenType.identifier, value: 'x', line: 1, column: 8 },
      { type: TokenType.number, value: '10', line: 1, column: 10 }
    ];

    const builder = new ASTBuilder();
    const ir = await builder.build(tokenGenerator(tokens));

    assert(ir.statements.length === 1);
    const stmt = ir.statements[0];
    assert(stmt instanceof AssignmentExpression);
    assert(stmt.left === 'x');
    assert(stmt.right instanceof NumericLiteral);
    assert(stmt.right.value === 10);
  });

  it('assignment expression with binary', async () => {
    const tokens = [
      { type: TokenType.identifier, value: 'x', line: 1, column: 1 },
      { type: TokenType.operator, value: '=', line: 1, column: 3 },
      { type: TokenType.identifier, value: 'a', line: 1, column: 5 },
      { type: TokenType.operator, value: '+', line: 1, column: 7 },
      { type: TokenType.identifier, value: 'b', line: 1, column: 9 }
    ];

    const builder = new ASTBuilder();
    const ir = await builder.build(tokenGenerator(tokens));

    assert(ir.statements.length === 1);
    const stmt = ir.statements[0];
    assert(stmt instanceof AssignmentExpression);
    assert(stmt.left === 'x');
    assert(stmt.right instanceof BinaryExpression);
    assert(stmt.right.operator === '+');
    assert(stmt.right.left instanceof Identifier);
    assert(stmt.right.left.name === 'a');
    assert(stmt.right.right instanceof Identifier);
    assert(stmt.right.right.name === 'b');
  });

  it('print statement', async () => {
    const tokens = [
      { type: TokenType.keyword, value: 'print', line: 1, column: 1 },
      { type: TokenType.identifier, value: 'x', line: 1, column: 7 }
    ];

    const builder = new ASTBuilder();
    const ir = await builder.build(tokenGenerator(tokens));

    assert(ir.statements.length === 1);
    const stmt = ir.statements[0];
    assert(stmt instanceof PrintStatement);
    assert(stmt.argument instanceof Identifier);
    assert(stmt.argument.name === 'x');
  });

  it('if statement', async () => {
    const tokens = [
      { type: TokenType.keyword, value: 'if', line: 1, column: 1 },
      { type: TokenType.identifier, value: 'x', line: 1, column: 4 },
      { type: TokenType.operator, value: '>', line: 1, column: 6 },
      { type: TokenType.number, value: '0', line: 1, column: 8 },
      { type: TokenType.keyword, value: 'print', line: 2, column: 3 },
      { type: TokenType.identifier, value: 'x', line: 2, column: 9 },
      { type: TokenType.keyword, value: 'endif', line: 3, column: 1 }
    ];

    const builder = new ASTBuilder();
    const ir = await builder.build(tokenGenerator(tokens));

    assert(ir.statements.length === 1);
    const stmt = ir.statements[0];
    assert(stmt instanceof IfStatement);
    assert(stmt.test instanceof BinaryExpression);
    assert(stmt.test.operator === '>');
    assert(stmt.consequent.length === 1);
    assert(stmt.consequent[0] instanceof PrintStatement);
  });

  it('while statement', async () => {
    const tokens = [
      { type: TokenType.keyword, value: 'as', line: 1, column: 1 },
      { type: TokenType.identifier, value: 'x', line: 1, column: 4 },
      { type: TokenType.operator, value: '>', line: 1, column: 6 },
      { type: TokenType.number, value: '0', line: 1, column: 8 },
      { type: TokenType.identifier, value: 'x', line: 2, column: 3 },
      { type: TokenType.operator, value: '=', line: 2, column: 5 },
      { type: TokenType.identifier, value: 'x', line: 2, column: 7 },
      { type: TokenType.operator, value: '-', line: 2, column: 9 },
      { type: TokenType.number, value: '1', line: 2, column: 11 },
      { type: TokenType.keyword, value: 'repeat', line: 3, column: 1 }
    ];

    const builder = new ASTBuilder();
    const ir = await builder.build(tokenGenerator(tokens));

    assert(ir.statements.length === 1);
    const stmt = ir.statements[0];
    assert(stmt instanceof WhileStatement);
    assert(stmt.test instanceof BinaryExpression);
    assert(stmt.test.operator === '>');
    assert(stmt.body.length === 1);
    assert(stmt.body[0] instanceof AssignmentExpression);
  });
});