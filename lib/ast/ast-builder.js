/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/

import { TokenType } from '../tokenizer/token-type.js';
import { Program, VariableDeclaration, AssignmentExpression, BinaryExpression, IfStatement, WhileStatement, PrintStatement, Identifier, NumericLiteral, StringLiteral } from './ir-nodes.js';

// ASTBuilder builds an IR AST from tokens using a state machine
export class ASTBuilder {
  constructor() {
    this.tokens = null;
    this.index = 0;
  }

  // Main entry point: build AST from async generator of tokens
  async build(tokens) {
    const allTokens = [];
    for await (const token of tokens) {
      allTokens.push(token);
    }
    this.tokens = allTokens;
    this.index = 0;
    this.parse();
    return this.program;
  }

  parse() {
    this.program = new Program(this.parseBlock(null), null);
  }

  parseBlock(endKeyword) {
    const statements = [];
    while (this.index < this.tokens.length) {
      if (endKeyword && this.tokens[this.index].type === TokenType.keyword && this.tokens[this.index].value === endKeyword) {
        this.index++;
        return statements;
      }
      statements.push(this.parseStatement());
    }
    if (endKeyword) throw new Error(`Expected '${endKeyword}'`);
    return statements;
  }

  parseStatement() {
    const token = this.tokens[this.index++];
    if (token.type === TokenType.keyword) {
      if (token.value === 'make') {
        const idToken = this.tokens[this.index++];
        if (idToken.type !== TokenType.identifier) throw new Error(`Expected identifier after 'make'`);
        const expr = this.parseFullExpression();
        return new VariableDeclaration(idToken.value, expr, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'assign') {
        const idToken = this.tokens[this.index++];
        if (idToken.type !== TokenType.identifier) throw new Error(`Expected identifier after 'assign'`);
        const expr = this.parseFullExpression();
        return new AssignmentExpression(idToken.value, expr, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'print') {
        const expr = this.parseFullExpression();
        return new PrintStatement(expr, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'if') {
        const test = this.parseFullExpression();
        const consequent = this.parseBlock('endif');
        return new IfStatement(test, consequent, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'as') {
        const test = this.parseFullExpression();
        const body = this.parseBlock('repeat');
        return new WhileStatement(test, body, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else {
        throw new Error(`Unexpected keyword: ${token.value}`);
      }
    } else if (token.type === TokenType.identifier) {
      // assignment
      const opToken = this.tokens[this.index++];
      if (opToken.type !== TokenType.operator || opToken.value !== '=') throw new Error(`Expected '=' after identifier`);
      const expr = this.parseFullExpression();
      return new AssignmentExpression(token.value, expr, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
    } else {
      throw new Error(`Unexpected token: ${token.type} ${token.value}`);
    }
  }

  // Parse a full expression, including binary operations
  parseFullExpression() {
    const token = this.tokens[this.index++];
    let expr = this.parseExpression(token);
    while (this.index < this.tokens.length && this.tokens[this.index].type === TokenType.operator) {
      const opToken = this.tokens[this.index++];
      const rightToken = this.tokens[this.index++];
      const right = this.parseExpression(rightToken);
      expr = new BinaryExpression(expr, opToken.value, right, { start: expr.loc.start, end: right.loc.end });
    }
    return expr;
  }

  // Parse a single expression from a token
  parseExpression(token) {
    if (token.type === TokenType.identifier) {
      return new Identifier(token.value, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
    } else if (token.type === TokenType.number) {
      return new NumericLiteral(Number(token.value), { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
    } else if (token.type === TokenType.string) {
      return new StringLiteral(token.value, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } }); // Already without quotes from preprocessor
    } else {
      throw new Error(`Unexpected expression token: ${token.type} ${token.value}`);
    }
  }
}