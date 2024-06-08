/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * GNU General Public License v3.0 (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)
*/
import { Transform } from 'node:stream';
import { TokenType } from '../tokenizer/token-type.js';
import {CodeGenerator} from '@babel/generator';
import * as t from '@babel/types';
import _traverse from "@babel/traverse";
const traverse = _traverse.default;

class ASTState {
  static initial = new ASTState('initial');
  static variableDeclaration = new ASTState('variableDeclaration');
  static variableAssignment = new ASTState('variableAssignment');
  static assignmentExpression = new ASTState('assignmentExpression');
  static ifStatement = new ASTState('ifStatement');
  static asStatement = new ASTState('asStatement');
  static print = new ASTState('print');

  constructor(name) {
    this.name = name;
  }
}

const stateTokensToCollect = new Map([
  [ASTState.initial, 0],
  [ASTState.variableDeclaration, 2],
  [ASTState.variableAssignment, 2],
  [ASTState.assignmentExpression, 4],
  [ASTState.ifStatement, 3],
  [ASTState.asStatement, 3],
  [ASTState.print, 1]
]);

class ASTError extends Error {
  constructor (message) {super(message);}
}

export class BabelAST extends Transform {
  #state;
  #currentTokens;
  #tokensToCollect;
  #statements;
  #ifBlockStatements;
  #ifMode;
  constructor () {
    super({ writableObjectMode: true });
    this.streamName = 'BabelAST';
    this.#state = ASTState.initial;
    this.#currentTokens = [];
    this.#tokensToCollect = 0;
    this.#statements = [];
    this.#ifBlockStatements = [];
    this.#ifMode = 0;
  }

  _incrementStatementStack() {
    this.#ifBlockStatements.unshift([]);
  }
  _popDecrementStatementStack() {
    return this.#ifBlockStatements.shift();
  }
  _pushStatement(statement) {
    if(this.#ifMode > 0) {
      this.#ifBlockStatements[0].push(statement);
    } else {
      this.#statements.push(statement);
    }
  }
  _setAccumulateState(nextState) {
    this.#state = nextState;
    this.#tokensToCollect = stateTokensToCollect.get(nextState);
  }

  _createBinaryExpression(leftToken, operatorToken, rightToken) {
    let left;
    if(leftToken.type === TokenType.identifier) {
      left = t.identifier(leftToken.value);
    } else if(leftToken.type ===  TokenType.number) {
      left = t.numericLiteral(leftToken.value);
    } else if(leftToken.type ===  TokenType.string) {
      left = t.stringLiteral(leftToken.value);
    }
    let right;
    if(rightToken.type === TokenType.identifier) {
      right = t.identifier(rightToken.value);
    } else if(rightToken.type ===  TokenType.number) {
      right = t.numericLiteral(rightToken.value);
    } else if(rightToken.type ===  TokenType.string) {
      right = t.stringLiteral(rightToken.value);
    }
    return t.binaryExpression(operatorToken.value, left, right);
  }

  _transform (token, encoding, callback) {
    // console.log('AST:' + JSON.stringify(token));

    if(this.#tokensToCollect > 0) {
      this.#currentTokens.push(token);
      this.#tokensToCollect--;
      if(this.#tokensToCollect > 0) {
        return callback();
      }
    }

    switch (this.#state) {
      case ASTState.initial: {
        if(token.type === TokenType.keyword) {
          if(token.value === 'make') {
            // define variable
            this.#currentTokens.push(token);
            this._setAccumulateState(ASTState.variableDeclaration);
            break;
          } else if(token.value === 'assign') {
            // assign variable
            this.#currentTokens.push(token);
            this._setAccumulateState(ASTState.variableAssignment);
            break;
          } else if(token.value === 'print') {
            // call function to print data
            this.#currentTokens.push(token);
            this._setAccumulateState(ASTState.print);
            break;
          } else if(token.value === 'as') {
            this.#currentTokens.push(token);
            this._setAccumulateState(ASTState.asStatement);
            this.#ifMode++;
            this._incrementStatementStack();
            break;
          } else if(token.value === 'repeat') {
            this.#ifMode--;
            const stackStatements = this._popDecrementStatementStack();
            const binaryExpression = stackStatements.shift();
            const blockStatement = t.blockStatement(stackStatements);
            const whileStatement = t.whileStatement(binaryExpression, blockStatement);

            this._pushStatement(whileStatement);
            //this.#ifBlockStatements = [];
            this.#state = ASTState.initial;
            this.#currentTokens = [];
            break;
          } else if(token.value === 'if') {
            this.#currentTokens.push(token);
            this._setAccumulateState(ASTState.ifStatement);
            this.#ifMode++;
            this._incrementStatementStack();
            break;
          } else if(token.value === 'endif') {
            this.#ifMode--;
            const stackStatements = this._popDecrementStatementStack();
            const binaryExpression = stackStatements.shift();
            const blockStatement = t.blockStatement(stackStatements);
            const ifStatement = t.ifStatement(binaryExpression, blockStatement);

            this._pushStatement(ifStatement);
            //this.#ifBlockStatements = [];
            this.#state = ASTState.initial;
            this.#currentTokens = [];
            break;
          }
        } else if(token.type === TokenType.identifier) {
          // assignment expression
          this.#currentTokens.push(token);
          this._setAccumulateState(ASTState.assignmentExpression);
          break;
        }
        break;
      }

      case ASTState.asStatement: {
        const leftToken = this.#currentTokens[1];
        const operatorToken = this.#currentTokens[2];
        const rightToken = this.#currentTokens[3];

        const binaryExpression = this._createBinaryExpression(leftToken, operatorToken, rightToken);
        this._pushStatement(binaryExpression);
        this.#state = ASTState.initial;
        this.#currentTokens = [];
        break;
      }
      case ASTState.ifStatement: {
        const leftToken = this.#currentTokens[1];
        const operatorToken = this.#currentTokens[2];
        const rightToken = this.#currentTokens[3];

        const binaryExpression = this._createBinaryExpression(leftToken, operatorToken, rightToken);
        this._pushStatement(binaryExpression);
        this.#state = ASTState.initial;
        this.#currentTokens = [];
        break;
      }
      case ASTState.assignmentExpression: {
        const assignIdentifierToken = this.#currentTokens[0];
        const identifier = t.identifier(assignIdentifierToken.value);

        const leftToken = this.#currentTokens[2];
        const operatorToken = this.#currentTokens[3];
        const rightToken = this.#currentTokens[4];

        const binaryExpression = this._createBinaryExpression(leftToken, operatorToken, rightToken);
        
        const assignmentExpression = t.assignmentExpression('=', identifier, binaryExpression);
        const expressionStatement = t.expressionStatement(assignmentExpression);

        this._pushStatement(expressionStatement);

        this.#state = ASTState.initial;
        this.#currentTokens = [];
        break;
      }
      case ASTState.print: {
        const valueToken = this.#currentTokens[1];
        let value;
        if(valueToken.type === TokenType.identifier) {
          value = t.identifier(valueToken.value);
        } else if(valueToken.type === TokenType.string) {
          value = t.stringLiteral(valueToken.value);
        } else {
          this.destroy(new ASTError('Invalid variableDeclaration. Expected identifier or string.'));
        }

        const identifierConsole = t.identifier('console');
        const identifierLog = t.identifier('log');

        const memberExpression = t.memberExpression(identifierConsole, identifierLog);
        const callExpression = t.callExpression(memberExpression, [value]);
        const expressionStatement = t.expressionStatement(callExpression);

        this._pushStatement(expressionStatement);

        this.#state = ASTState.initial;
        this.#currentTokens = [];
        break;
      }
      case ASTState.variableDeclaration: {
        const identifierToken = this.#currentTokens[1];
        const literalToken = this.#currentTokens[2];
        if(identifierToken.type !== TokenType.identifier) {
          this.destroy(new ASTError('Invalid variableDeclaration. Expected identifier.'));
        }
        if(literalToken.type !== TokenType.string && literalToken.type !== TokenType.number) {
          this.destroy(new ASTError('Invalid variableDeclaration. Expected number or string.'));
        }

        //t.booleanLiteral(value);
        //t.numericLiteral(value);
        //t.stringLiteral(value);

        const identifier = t.identifier(identifierToken.value);
  
        let value;
        if(literalToken.type === TokenType.string) {
          value = t.stringLiteral(literalToken.value);
        } else if(literalToken.type === TokenType.number) {
          value = t.numericLiteral(literalToken.value);
        }
        
        const variableDeclarator = t.variableDeclarator(identifier, value);
        const variableDeclaration = t.variableDeclaration('let', [variableDeclarator]);
        this._pushStatement(variableDeclaration);

        this.#state = ASTState.initial;
        this.#currentTokens = [];
        break;
      }
      case ASTState.variableAssignment: {
        const identifierToken = this.#currentTokens[1];
        const literalToken = this.#currentTokens[2];
        if(identifierToken.type !== TokenType.identifier) {
          this.destroy(new ASTError('Invalid variableDeclaration. Expected identifier.'));
        }
        if(literalToken.type !== TokenType.string 
          && literalToken.type !== TokenType.number
          && literalToken.type !== TokenType.identifier) {
          this.destroy(new ASTError('Invalid variableDeclaration. Expected number or string.'));
        }
  
        const identifier = t.identifier(identifierToken.value);

        let value;
        if(literalToken.type === TokenType.string) {
          value = t.stringLiteral(literalToken.value);
        } else if(literalToken.type === TokenType.number) {
          value = t.numericLiteral(literalToken.value);
        } else if(literalToken.type === TokenType.identifier) {
          value = t.identifier(literalToken.value);
        } 

        const assignmentExpression = t.assignmentExpression('=', identifier, value);
        const expressionStatement = t.expressionStatement(assignmentExpression);
        this._pushStatement(expressionStatement);

        this.#state = ASTState.initial;
        this.#currentTokens = [];

        break;
      }
    }
    return callback();
  }

  _flush(callback) {
    const program = t.program(this.#statements, [], 'script');
    const file = t.file(program);
    const cg = new CodeGenerator(file);

    let nodeCount = 0;
    traverse(cg._ast, {
      enter() {
        nodeCount++;
      }
    });
    this.astNodeCount = nodeCount;


    const output = cg.generate()
    this.push(output.code);
    return callback();
  }
}