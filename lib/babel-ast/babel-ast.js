/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import { Transform } from 'node:stream';
import { TokenType } from '../tokenizer/token-type.js';
import {CodeGenerator} from '@babel/generator';
import * as t from '@babel/types';
import _traverse from "@babel/traverse";
const traverse = _traverse.default;

const ASTState = Object.freeze({
  initial: 'initial',
  variableDeclaration: 'variableDeclaration',
  variableAssignment: 'variableAssignment',
  assignmentExpression: 'assignmentExpression',
  ifStatement: 'ifStatement',
  asStatement: 'asStatement',
  print: 'print'
});

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

/**
 * Represents a transformation stream that converts tokens into an Abstract Syntax Tree (AST)
 * using Babel's AST format. This class extends the Transform stream class, allowing it to be
 * used in a streaming pipeline where tokens are transformed into a Babel-compatible AST format.
 */
export class BabelAST extends Transform {
  #state;
  #currentTokens;
  #tokensToCollect;
  #statements;
  #ifBlockStatements;
  #ifMode;

  /**
   * Initializes a new instance of the BabelAST class.
   * Sets up the initial state, including the stream name and various internal collections
   * used to manage tokens and statements during the transformation process.
   */
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

  /**
   * Increments the statement stack by adding a new array at the beginning.
   * This method is used to manage nested statements, particularly for handling blocks
   * within conditional statements and loops.
   */
  _incrementStatementStack() {
    this.#ifBlockStatements.unshift([]);
  }

  /**
   * Pops and returns the first array of statements from the statement stack.
   * This method is used when exiting a block of statements, allowing the collected
   * statements within that block to be processed or attached to the appropriate AST node.
   * @returns {Array} The array of statements that was at the beginning of the statement stack.
   */
  _popDecrementStatementStack() {
    return this.#ifBlockStatements.shift();
  }

  /**
   * Pushes a given statement into the current statement collection.
   * If in "if mode", the statement is added to the current block of if statements;
   * otherwise, it's added to the main statements array.
   * @param {Object} statement - The AST node representing the statement to be added.
   */
  _pushStatement(statement) {
    if(this.#ifMode > 0) {
      this.#ifBlockStatements[0].push(statement);
    } else {
      this.#statements.push(statement);
    }
  }

  /**
   * Sets the state of the AST transformation to accumulate tokens for a specific AST node type.
   * The number of tokens to collect is determined based on the next state.
   * @param {string} nextState - The state to transition to, which determines the type of AST node being built.
   */
  _setAccumulateState(nextState) {
    this.#state = nextState;
    this.#tokensToCollect = stateTokensToCollect.get(nextState);
  }

  /**
   * Creates a binary expression AST node from the given tokens.
   * @param {Object} leftToken - The token representing the left-hand side of the expression.
   * @param {Object} operatorToken - The token representing the operator of the expression.
   * @param {Object} rightToken - The token representing the right-hand side of the expression.
   * @returns {Object} The binary expression AST node.
   */
  _createBinaryExpression(leftToken, operatorToken, rightToken) {
    const left = this.#tokenToBabelValue(leftToken);
    const right = this.#tokenToBabelValue(rightToken);
    return t.binaryExpression(operatorToken.value, left, right);
  }

  /**
   * Converts a token to a Babel AST node for identifier, number, or string literals.
   * @param {Object} token - The token to convert.
   * @returns {Object} The corresponding Babel AST node.
   * @throws {ASTError} If the token type is not supported.
   */
  #tokenToBabelValue(token) {
    if (token.type === TokenType.identifier) {
      return t.identifier(token.value);
    } else if (token.type === TokenType.number) {
      return t.numericLiteral(token.value);
    } else if (token.type === TokenType.string) {
      return t.stringLiteral(token.value);
    } else {
      throw new ASTError(`Unsupported token type for value: ${token.type}`);
    }
  }

  /**
   * Handles the initial state by processing the incoming token.
   * @param {Object} token - The token to process.
   */
  #handleInitialState(token) {
    if (token.type === TokenType.keyword) {
      if (token.value === 'make') {
        // define variable
        this.#currentTokens.push(token);
        this._setAccumulateState(ASTState.variableDeclaration);
      } else if (token.value === 'assign') {
        // assign variable
        this.#currentTokens.push(token);
        this._setAccumulateState(ASTState.variableAssignment);
      } else if (token.value === 'print') {
        // call function to print data
        this.#currentTokens.push(token);
        this._setAccumulateState(ASTState.print);
      } else if (token.value === 'as') {
        this.#currentTokens.push(token);
        this._setAccumulateState(ASTState.asStatement);
        this.#ifMode++;
        this._incrementStatementStack();
      } else if (token.value === 'repeat') {
        this.#ifMode--;
        const stackStatements = this._popDecrementStatementStack();
        const binaryExpression = stackStatements.shift();
        const blockStatement = t.blockStatement(stackStatements);
        const whileStatement = t.whileStatement(binaryExpression, blockStatement);

        this._pushStatement(whileStatement);
        this.#state = ASTState.initial;
        this.#currentTokens = [];
      } else if (token.value === 'if') {
        this.#currentTokens.push(token);
        this._setAccumulateState(ASTState.ifStatement);
        this.#ifMode++;
        this._incrementStatementStack();
      } else if (token.value === 'endif') {
        this.#ifMode--;
        const stackStatements = this._popDecrementStatementStack();
        const binaryExpression = stackStatements.shift();
        const blockStatement = t.blockStatement(stackStatements);
        const ifStatement = t.ifStatement(binaryExpression, blockStatement);

        this._pushStatement(ifStatement);
        this.#state = ASTState.initial;
        this.#currentTokens = [];
      }
    } else if (token.type === TokenType.identifier) {
      // assignment expression
      this.#currentTokens.push(token);
      this._setAccumulateState(ASTState.assignmentExpression);
    }
  }

  /**
   * Handles the variableDeclaration state.
   */
  #handleVariableDeclaration() {
    const identifierToken = this.#currentTokens[1];
    const literalToken = this.#currentTokens[2];
    if (identifierToken.type !== TokenType.identifier) {
      this.destroy(new ASTError('Invalid variableDeclaration. Expected identifier.'));
    }
    if (literalToken.type !== TokenType.string && literalToken.type !== TokenType.number) {
      this.destroy(new ASTError('Invalid variableDeclaration. Expected number or string.'));
    }

    const identifier = t.identifier(identifierToken.value);

    let value;
    if (literalToken.type === TokenType.string) {
      value = t.stringLiteral(literalToken.value);
    } else if (literalToken.type === TokenType.number) {
      value = t.numericLiteral(literalToken.value);
    }

    const variableDeclarator = t.variableDeclarator(identifier, value);
    const variableDeclaration = t.variableDeclaration('let', [variableDeclarator]);
    this._pushStatement(variableDeclaration);

    this.#state = ASTState.initial;
    this.#currentTokens = [];
  }

  /**
   * Handles the variableAssignment state.
   */
  #handleVariableAssignment() {
    const identifierToken = this.#currentTokens[1];
    const literalToken = this.#currentTokens[2];
    if (identifierToken.type !== TokenType.identifier) {
      this.destroy(new ASTError('Invalid variableDeclaration. Expected identifier.'));
    }
    if (literalToken.type !== TokenType.string
      && literalToken.type !== TokenType.number
      && literalToken.type !== TokenType.identifier) {
      this.destroy(new ASTError('Invalid variableDeclaration. Expected number or string.'));
    }

    const identifier = t.identifier(identifierToken.value);

    const value = this.#tokenToBabelValue(literalToken);

    const assignmentExpression = t.assignmentExpression('=', identifier, value);
    const expressionStatement = t.expressionStatement(assignmentExpression);
    this._pushStatement(expressionStatement);

    this.#state = ASTState.initial;
    this.#currentTokens = [];
  }

  /**
   * Handles the assignmentExpression state.
   */
  #handleAssignmentExpression() {
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
  }

  /**
   * Handles the ifStatement state.
   */
  #handleIfStatement() {
    const leftToken = this.#currentTokens[1];
    const operatorToken = this.#currentTokens[2];
    const rightToken = this.#currentTokens[3];

    const binaryExpression = this._createBinaryExpression(leftToken, operatorToken, rightToken);
    this._pushStatement(binaryExpression);
    this.#state = ASTState.initial;
    this.#currentTokens = [];
  }

  /**
   * Handles the asStatement state.
   */
  #handleAsStatement() {
    const leftToken = this.#currentTokens[1];
    const operatorToken = this.#currentTokens[2];
    const rightToken = this.#currentTokens[3];

    const binaryExpression = this._createBinaryExpression(leftToken, operatorToken, rightToken);
    this._pushStatement(binaryExpression);
    this.#state = ASTState.initial;
    this.#currentTokens = [];
  }

  /**
   * Handles the print state.
   */
  #handlePrint() {
    const valueToken = this.#currentTokens[1];
    const value = this.#tokenToBabelValue(valueToken);

    const identifierConsole = t.identifier('console');
    const identifierLog = t.identifier('log');

    const memberExpression = t.memberExpression(identifierConsole, identifierLog);
    const callExpression = t.callExpression(memberExpression, [value]);
    const expressionStatement = t.expressionStatement(callExpression);

    this._pushStatement(expressionStatement);

    this.#state = ASTState.initial;
    this.#currentTokens = [];
  }

  /**
   * Transforms a token into the appropriate AST node(s) based on the current state.
   * This method is called for each token passed through the stream.
   * @param {Object} token - The token to transform.
   * @param {string} encoding - The encoding type of the token.
   * @param {Function} callback - The callback function to invoke when the transformation is complete.
   */
  _transform(token, encoding, callback) {
    // console.log('AST:' + JSON.stringify(token));

    if (this.#tokensToCollect > 0) {
      this.#currentTokens.push(token);
      this.#tokensToCollect--;
      if (this.#tokensToCollect > 0) {
        return callback();
      }
    }

    switch (this.#state) {
      case ASTState.initial:
        this.#handleInitialState(token);
        break;
      case ASTState.variableDeclaration:
        this.#handleVariableDeclaration();
        break;
      case ASTState.variableAssignment:
        this.#handleVariableAssignment();
        break;
      case ASTState.assignmentExpression:
        this.#handleAssignmentExpression();
        break;
      case ASTState.ifStatement:
        this.#handleIfStatement();
        break;
      case ASTState.asStatement:
        this.#handleAsStatement();
        break;
      case ASTState.print:
        this.#handlePrint();
        break;
    }
    return callback();
  }

  /**
   * Flushes any remaining AST nodes from the internal state to the output stream.
   * This method is called when there are no more tokens to transform.
   * @param {Function} callback - The callback function to invoke when flushing is complete.
   */
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