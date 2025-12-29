/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import { describe, it } from "node:test";
import assert from "node:assert";

import { ASTBuilder } from "./ast-builder.js";
import { TokenType } from "../tokenizer/token-type.js";
import { Program, VariableDeclaration, AssignmentExpression, BinaryExpression, IfStatement, WhileStatement, PrintStatement, FunctionDeclaration, ReturnStatement, CallStatement, Identifier, NumericLiteral, StringLiteral, SinExpression, CosExpression, UnaryMinusExpression } from "./ir-nodes.js";

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

  it('function declaration', async () => {
    const tokens = [
      { type: TokenType.keyword, value: 'func', line: 1, column: 1 },
      { type: TokenType.identifier, value: 'add', line: 1, column: 10 },
      { type: TokenType.identifier, value: 'a', line: 1, column: 14 },
      { type: TokenType.identifier, value: 'b', line: 1, column: 16 },
      { type: TokenType.keyword, value: 'return', line: 2, column: 3 },
      { type: TokenType.identifier, value: 'result', line: 2, column: 10 },
      { type: TokenType.keyword, value: 'end', line: 3, column: 1 }
    ];

    const builder = new ASTBuilder();
    const ir = await builder.build(tokenGenerator(tokens));

    assert(ir.statements.length === 1);
    const stmt = ir.statements[0];
    assert(stmt instanceof FunctionDeclaration);
    assert(stmt.name === 'add');
    assert.deepEqual(stmt.params, ['a', 'b']);
    assert(stmt.body.length === 1);
    assert(stmt.body[0] instanceof ReturnStatement);
    assert(stmt.body[0].argument === 'result');
  });

  it('return statement', async () => {
    const tokens = [
      { type: TokenType.keyword, value: 'return', line: 1, column: 1 },
      { type: TokenType.identifier, value: 'x', line: 1, column: 8 }
    ];

    const builder = new ASTBuilder();
    const ir = await builder.build(tokenGenerator(tokens));

    assert(ir.statements.length === 1);
    const stmt = ir.statements[0];
    assert(stmt instanceof ReturnStatement);
    assert(stmt.argument === 'x');
  });

  it('call statement with result', async () => {
    const tokens = [
      { type: TokenType.keyword, value: 'call', line: 1, column: 1 },
      { type: TokenType.identifier, value: 'double', line: 1, column: 6 },
      { type: TokenType.identifier, value: 'x', line: 1, column: 13 },
      { type: TokenType.keyword, value: 'into', line: 1, column: 15 },
      { type: TokenType.identifier, value: 'result', line: 1, column: 20 }
    ];

    const builder = new ASTBuilder();
    const ir = await builder.build(tokenGenerator(tokens));

    assert(ir.statements.length === 1);
    const stmt = ir.statements[0];
    assert(stmt instanceof CallStatement);
    assert(stmt.callee === 'double');
    assert(stmt.arguments.length === 1);
    assert(stmt.arguments[0] instanceof Identifier);
    assert(stmt.arguments[0].name === 'x');
    assert(stmt.result === 'result');
  });

  it('call statement void', async () => {
    const tokens = [
      { type: TokenType.keyword, value: 'call', line: 1, column: 1 },
      { type: TokenType.identifier, value: 'print', line: 1, column: 6 },
      { type: TokenType.string, value: 'hello', line: 1, column: 12 }
    ];

    const builder = new ASTBuilder();
    const ir = await builder.build(tokenGenerator(tokens));

    assert(ir.statements.length === 1);
    const stmt = ir.statements[0];
    assert(stmt instanceof CallStatement);
    assert(stmt.callee === 'print');
    assert(stmt.arguments.length === 1);
    assert(stmt.arguments[0] instanceof StringLiteral);
    assert(stmt.arguments[0].value === 'hello');
    assert(stmt.result === null);
  });

  it('call statement with multiple args and result', async () => {
    const tokens = [
      { type: TokenType.keyword, value: 'call', line: 1, column: 1 },
      { type: TokenType.identifier, value: 'add', line: 1, column: 6 },
      { type: TokenType.identifier, value: 'a', line: 1, column: 10 },
      { type: TokenType.number, value: 5, line: 1, column: 12 },
      { type: TokenType.keyword, value: 'into', line: 1, column: 14 },
      { type: TokenType.identifier, value: 'total', line: 1, column: 19 }
    ];

    const builder = new ASTBuilder();
    const ir = await builder.build(tokenGenerator(tokens));

    assert(ir.statements.length === 1);
    const stmt = ir.statements[0];
    assert(stmt instanceof CallStatement);
    assert(stmt.callee === 'add');
    assert(stmt.arguments.length === 2);
    assert(stmt.arguments[0] instanceof Identifier);
    assert(stmt.arguments[0].name === 'a');
    assert(stmt.arguments[1] instanceof NumericLiteral);
    assert(stmt.arguments[1].value === 5);
    assert(stmt.result === 'total');
  });

  it('multiplication precedence over addition', async () => {
    const tokens = [
      { type: TokenType.identifier, value: 'x', line: 1, column: 1 },
      { type: TokenType.operator, value: '=', line: 1, column: 3 },
      { type: TokenType.identifier, value: 'a', line: 1, column: 5 },
      { type: TokenType.operator, value: '+', line: 1, column: 7 },
      { type: TokenType.identifier, value: 'b', line: 1, column: 9 },
      { type: TokenType.operator, value: '*', line: 1, column: 11 },
      { type: TokenType.identifier, value: 'c', line: 1, column: 13 }
    ];

    const builder = new ASTBuilder();
    const ir = await builder.build(tokenGenerator(tokens));

    assert(ir.statements.length === 1);
    const stmt = ir.statements[0];
    assert(stmt instanceof AssignmentExpression);
    assert(stmt.left === 'x');
    const expr = stmt.right;
    assert(expr instanceof BinaryExpression);
    assert(expr.operator === '+');
    assert(expr.left instanceof Identifier);
    assert(expr.left.name === 'a');
    assert(expr.right instanceof BinaryExpression);
    assert(expr.right.operator === '*');
    assert(expr.right.left instanceof Identifier);
    assert(expr.right.left.name === 'b');
    assert(expr.right.right instanceof Identifier);
    assert(expr.right.right.name === 'c');
  });

  it('division and modulo precedence', async () => {
    const tokens = [
      { type: TokenType.identifier, value: 'x', line: 1, column: 1 },
      { type: TokenType.operator, value: '=', line: 1, column: 3 },
      { type: TokenType.identifier, value: 'a', line: 1, column: 5 },
      { type: TokenType.operator, value: '/', line: 1, column: 7 },
      { type: TokenType.identifier, value: 'b', line: 1, column: 9 },
      { type: TokenType.operator, value: '%', line: 1, column: 11 },
      { type: TokenType.identifier, value: 'c', line: 1, column: 13 }
    ];

    const builder = new ASTBuilder();
    const ir = await builder.build(tokenGenerator(tokens));

    assert(ir.statements.length === 1);
    const stmt = ir.statements[0];
    assert(stmt instanceof AssignmentExpression);
    assert(stmt.left === 'x');
    const expr = stmt.right;
    assert(expr instanceof BinaryExpression);
    assert(expr.operator === '%');
    assert(expr.left instanceof BinaryExpression);
    assert(expr.left.operator === '/');
    assert(expr.left.left instanceof Identifier);
    assert(expr.left.left.name === 'a');
    assert(expr.left.right instanceof Identifier);
    assert(expr.left.right.name === 'b');
    assert(expr.right instanceof Identifier);
    assert(expr.right.name === 'c');
  });

  it('comparison precedence over arithmetic', async () => {
    const tokens = [
      { type: TokenType.identifier, value: 'x', line: 1, column: 1 },
      { type: TokenType.operator, value: '=', line: 1, column: 3 },
      { type: TokenType.identifier, value: 'a', line: 1, column: 5 },
      { type: TokenType.operator, value: '==', line: 1, column: 7 },
      { type: TokenType.identifier, value: 'b', line: 1, column: 10 },
      { type: TokenType.operator, value: '+', line: 1, column: 12 },
      { type: TokenType.identifier, value: 'c', line: 1, column: 14 }
    ];

    const builder = new ASTBuilder();
    const ir = await builder.build(tokenGenerator(tokens));

    assert(ir.statements.length === 1);
    const stmt = ir.statements[0];
    assert(stmt instanceof AssignmentExpression);
    assert(stmt.left === 'x');
    const expr = stmt.right;
    assert(expr instanceof BinaryExpression);
    assert(expr.operator === '==');
    assert(expr.left instanceof Identifier);
    assert(expr.left.name === 'a');
    assert(expr.right instanceof BinaryExpression);
    assert(expr.right.operator === '+');
    assert(expr.right.left instanceof Identifier);
    assert(expr.right.left.name === 'b');
    assert(expr.right.right instanceof Identifier);
    assert(expr.right.right.name === 'c');
  });

  it('sin expression', async () => {
    const tokens = [
      { type: TokenType.identifier, value: 'x', line: 1, column: 1 },
      { type: TokenType.operator, value: '=', line: 1, column: 3 },
      { type: TokenType.keyword, value: 'sin', line: 1, column: 5 },
      { type: TokenType.identifier, value: 'angle', line: 1, column: 9 },
      { type: TokenType.number, value: '100', line: 1, column: 15 }
    ];

    const builder = new ASTBuilder();
    const ir = await builder.build(tokenGenerator(tokens));

    assert(ir.statements.length === 1);
    const stmt = ir.statements[0];
    assert(stmt instanceof AssignmentExpression);
    assert(stmt.left === 'x');
    const expr = stmt.right;
    assert(expr instanceof SinExpression);
    assert(expr.argument instanceof Identifier);
    assert(expr.argument.name === 'angle');
    assert(expr.scale instanceof NumericLiteral);
    assert(expr.scale.value === 100);
  });

  it('cos expression', async () => {
    const tokens = [
      { type: TokenType.identifier, value: 'x', line: 1, column: 1 },
      { type: TokenType.operator, value: '=', line: 1, column: 3 },
      { type: TokenType.keyword, value: 'cos', line: 1, column: 5 },
      { type: TokenType.identifier, value: 'angle', line: 1, column: 9 },
      { type: TokenType.number, value: '100', line: 1, column: 15 }
    ];

    const builder = new ASTBuilder();
    const ir = await builder.build(tokenGenerator(tokens));

    assert(ir.statements.length === 1);
    const stmt = ir.statements[0];
    assert(stmt instanceof AssignmentExpression);
    assert(stmt.left === 'x');
    const expr = stmt.right;
    assert(expr instanceof CosExpression);
    assert(expr.argument instanceof Identifier);
    assert(expr.argument.name === 'angle');
    assert(expr.scale instanceof NumericLiteral);
    assert(expr.scale.value === 100);
  });

  it('unary minus', async () => {
    const tokens = [
      { type: TokenType.identifier, value: 'x', line: 1, column: 1 },
      { type: TokenType.operator, value: '=', line: 1, column: 3 },
      { type: TokenType.operator, value: '-', line: 1, column: 5 },
      { type: TokenType.identifier, value: 'a', line: 1, column: 6 }
    ];

    const builder = new ASTBuilder();
    const ir = await builder.build(tokenGenerator(tokens));

    assert(ir.statements.length === 1);
    const stmt = ir.statements[0];
    assert(stmt instanceof AssignmentExpression);
    assert(stmt.left === 'x');
    const expr = stmt.right;
    assert(expr instanceof UnaryMinusExpression);
    assert(expr.expression instanceof Identifier);
    assert(expr.expression.name === 'a');
  });
});