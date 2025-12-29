/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/

import { TokenType } from '../tokenizer/token-type.js';
import { Program, VariableDeclaration, AssignmentExpression, BinaryExpression, IfStatement, WhileStatement, PrintStatement, FreeStatement, FunctionDeclaration, ReturnStatement, CallStatement, SDLInitStatement, SDLWindowStatement, SDLDelayStatement, SDLHandleEventsStatement, SDLCreateRendererStatement, SDLPutPixelStatement, SDLPresentStatement, SDLClearStatement, SDLSetColorStatement, SDLDrawLineStatement, Identifier, NumericLiteral, StringLiteral, SinExpression, CosExpression, UnaryMinusExpression } from './ir-nodes.js';

// Custom error class for AST building with location info
class ASTError extends Error {
  constructor(message, loc = null) {
    super(message);
    this.name = 'ASTError';
    this.loc = loc;
  }
}

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
    if (endKeyword) throw new ASTError(`Expected '${endKeyword}'`);
    return statements;
  }

  parseStatement() {
    const token = this.tokens[this.index++];
    if (token.type === TokenType.keyword) {
      if (token.value === 'make') {
        const idToken = this.tokens[this.index++];
        if (idToken.type !== TokenType.identifier) throw new ASTError(`Expected identifier after 'make'`, { line: token.line, column: token.column });
        const expr = this.parseFullExpression();
        return new VariableDeclaration(idToken.value, expr, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'assign') {
        const idToken = this.tokens[this.index++];
        if (idToken.type !== TokenType.identifier) throw new ASTError(`Expected identifier after 'assign'`, { line: token.line, column: token.column });
        const expr = this.parseFullExpression();
        return new AssignmentExpression(idToken.value, expr, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'print') {
        const expr = this.parseFullExpression();
        return new PrintStatement(expr, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'free') {
        const idToken = this.tokens[this.index++];
        if (idToken.type !== TokenType.identifier) throw new ASTError(`Expected identifier after 'free'`, { line: token.line, column: token.column });
        return new FreeStatement(idToken.value, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'if') {
        const test = this.parseFullExpression();
        const consequent = this.parseBlock('endif');
        return new IfStatement(test, consequent, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'as') {
        const test = this.parseFullExpression();
        const body = this.parseBlock('repeat');
        return new WhileStatement(test, body, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'func') {
        const nameToken = this.tokens[this.index++];
        if (nameToken.type !== TokenType.identifier) throw new ASTError(`Expected identifier after 'func'`, { line: token.line, column: token.column });
        const params = [];
        while (this.index < this.tokens.length && this.tokens[this.index].type === TokenType.identifier) {
          params.push(this.tokens[this.index++].value);
        }
        const body = this.parseBlock('end');
        return new FunctionDeclaration(nameToken.value, params, body, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'return') {
        const varToken = this.tokens[this.index++];
        if (varToken.type !== TokenType.identifier) throw new ASTError(`Expected identifier after 'return'`, { line: token.line, column: token.column });
        return new ReturnStatement(varToken.value, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'call') {
        const calleeToken = this.tokens[this.index++];
        if (calleeToken.type !== TokenType.identifier) throw new ASTError(`Expected identifier after 'call'`, { line: token.line, column: token.column });
        const args = [];
        while (this.index < this.tokens.length) {
          const next = this.tokens[this.index];
          if (this.canStartExpression(next)) {
            const expr = this.parseFullExpression();
            args.push(expr);
          } else {
            break;
          }
        }
        let result = null;
        if (this.index < this.tokens.length && this.tokens[this.index].type === TokenType.keyword && this.tokens[this.index].value === 'into') {
          this.index++; // consume 'into'
          if (this.index < this.tokens.length && this.tokens[this.index].type === TokenType.identifier) {
            result = this.tokens[this.index++].value;
          } else {
            throw new ASTError(`Expected identifier after 'into'`, { line: this.tokens[this.index - 1]?.line || 0, column: this.tokens[this.index - 1]?.column || 0 });
          }
        }
        return new CallStatement(calleeToken.value, args, result, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'sdlInit') {
        return new SDLInitStatement({ start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'sdlWindow') {
        const width = this.parseFullExpression();
        const height = this.parseFullExpression();
        const titleToken = this.tokens[this.index++];
        // console.log(`width:${JSON.stringify(width)}  height:${JSON.stringify(height)} titleToken: ${JSON.stringify(titleToken)}`);
        if (titleToken.type !== TokenType.string) throw new ASTError(`Expected string after height in sdlWindow`, { line: token.line, column: token.column });
        return new SDLWindowStatement(width, height, titleToken.value, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'sdlDelay') {
        const delay = this.parseFullExpression();
        return new SDLDelayStatement(delay, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'sdlEvents') {
        return new SDLHandleEventsStatement({ start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'sdlRenderer') {
        return new SDLCreateRendererStatement({ start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'sdlPutPixel') {
        const x = this.parseFullExpression();
        const y = this.parseFullExpression();
        const r = this.parseFullExpression();
        const g = this.parseFullExpression();
        const b = this.parseFullExpression();
        return new SDLPutPixelStatement(x, y, r, g, b, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'sdlPresent') {
        return new SDLPresentStatement({ start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'sdlClear') {
        return new SDLClearStatement({ start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'sdlSetColor') {
        const r = this.parseFullExpression();
        const g = this.parseFullExpression();
        const b = this.parseFullExpression();
        return new SDLSetColorStatement(r, g, b, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else if (token.value === 'sdlDrawLine') {
        const x1 = this.parseFullExpression();
        const y1 = this.parseFullExpression();
        const x2 = this.parseFullExpression();
        const y2 = this.parseFullExpression();
        return new SDLDrawLineStatement(x1, y1, x2, y2, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
      } else {
        throw new ASTError(`Unexpected keyword: ${token.value}`, { line: token.line, column: token.column });
      }
    } else if (token.type === TokenType.identifier) {
      // assignment
      const opToken = this.tokens[this.index++];
      if (opToken.type !== TokenType.operator || opToken.value !== '=') throw new ASTError(`Expected '=' after identifier`, { line: token.line, column: token.column });
      const expr = this.parseFullExpression();
      return new AssignmentExpression(token.value, expr, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
    } else {
      throw new ASTError(`Unexpected token: ${token.type} ${token.value}`, { line: token.line, column: token.column });
    }
  }

  // Parse a full expression, starting with comparison
  parseFullExpression() {
    return this.parseComparison();
  }

  // Parse comparison expressions (== != < > <= >=)
  parseComparison() {
    let expr = this.parseAdditive();
    while (this.index < this.tokens.length && this.tokens[this.index].type === TokenType.operator && (this.tokens[this.index].value === '==' || this.tokens[this.index].value === '!=' || this.tokens[this.index].value === '<' || this.tokens[this.index].value === '>' || this.tokens[this.index].value === '<=' || this.tokens[this.index].value === '>=')) {
      const opToken = this.tokens[this.index++];
      const right = this.parseAdditive();
      expr = new BinaryExpression(expr, opToken.value, right, { start: expr.loc.start, end: right.loc.end });
    }
    return expr;
  }

  // Parse additive expressions (+ -)
  parseAdditive() {
    let expr = this.parseMultiplicative();
    while (this.index < this.tokens.length && this.tokens[this.index].type === TokenType.operator && (this.tokens[this.index].value === '+' || this.tokens[this.index].value === '-')) {
      const opToken = this.tokens[this.index++];
      const right = this.parseMultiplicative();
      expr = new BinaryExpression(expr, opToken.value, right, { start: expr.loc.start, end: right.loc.end });
    }
    return expr;
  }

  // Parse multiplicative expressions (* / %)
  parseMultiplicative() {
    let expr = this.parseUnary();
    while (this.index < this.tokens.length && this.tokens[this.index].type === TokenType.operator && (this.tokens[this.index].value === '*' || this.tokens[this.index].value === '/' || this.tokens[this.index].value === '%')) {
      const opToken = this.tokens[this.index++];
      const right = this.parseUnary();
      expr = new BinaryExpression(expr, opToken.value, right, { start: expr.loc.start, end: right.loc.end });
    }
    return expr;
  }

  // Parse unary expressions (-)
  parseUnary() {
    if (this.index < this.tokens.length && this.tokens[this.index].type === TokenType.operator && this.tokens[this.index].value === '-') {
      const opToken = this.tokens[this.index++];
      const expr = this.parseUnary();
      return new UnaryMinusExpression(expr, { start: { line: opToken.line, column: opToken.column }, end: expr.loc.end });
    }
    return this.parsePrimary();
  }

  // Parse primary expressions
  parsePrimary() {
    const token = this.tokens[this.index++];
    if (token.type === TokenType.identifier) {
      return new Identifier(token.value, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
    } else if (token.type === TokenType.number) {
      return new NumericLiteral(Number(token.value), { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
    } else if (token.type === TokenType.string) {
      return new StringLiteral(token.value, { start: { line: token.line, column: token.column }, end: { line: token.line, column: token.column } });
    } else if (token.type === TokenType.keyword && token.value === 'sin') {
      const arg = this.parseFullExpression();
      const scale = this.parseFullExpression();
      return new SinExpression(arg, scale, { start: { line: token.line, column: token.column }, end: scale.loc.end });
    } else if (token.type === TokenType.keyword && token.value === 'cos') {
      const arg = this.parseFullExpression();
      const scale = this.parseFullExpression();
      return new CosExpression(arg, scale, { start: { line: token.line, column: token.column }, end: scale.loc.end });
    } else {
      throw new ASTError(`Unexpected expression token: ${token.type} ${token.value}`, { line: token.line, column: token.column });
    }
  }

  canStartExpression(token) {
    return token.type === TokenType.identifier || token.type === TokenType.number || token.type === TokenType.string || (token.type === TokenType.keyword && (token.value === 'sin' || token.value === 'cos')) || (token.type === TokenType.operator && token.value === '-');
  }
}