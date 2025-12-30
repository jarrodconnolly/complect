/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
 */

import { CodeGenerator } from '@babel/generator';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';
import { TokenType } from '../tokenizer/token-type.js';

const traverse = _traverse.default;

const ASTState = Object.freeze({
  initial: 'initial',
  variableDeclaration: 'variableDeclaration',
  variableAssignment: 'variableAssignment',
  assignmentExpression: 'assignmentExpression',
  ifStatement: 'ifStatement',
  asStatement: 'asStatement',
  print: 'print',
});

const stateTokensToCollect = new Map([
  [ASTState.initial, 0],
  [ASTState.variableDeclaration, 2],
  [ASTState.variableAssignment, 2],
  [ASTState.assignmentExpression, 4],
  [ASTState.ifStatement, 3],
  [ASTState.asStatement, 3],
  [ASTState.print, 1],
]);

class ASTError extends Error {}

export class BabelAST {
  #state;
  #currentTokens;
  #tokensToCollect;
  #statements;
  #statementStacks;
  #blockNestingLevel;

  /**
   * Initializes a new instance of the BabelAST class.
   * Sets up the initial state, including the stream name and various internal collections
   * used to manage tokens and statements during the transformation process.
   */
  constructor() {
    this.streamName = 'BabelAST';
    this.#state = ASTState.initial;
    this.#currentTokens = [];
    this.#tokensToCollect = 0;
    this.#statements = [];
    this.#statementStacks = [];
    this.#blockNestingLevel = 0;
  }

  /**
   * Increments the statement stack by adding a new array at the beginning.
   * This method is used to manage nested statements, particularly for handling blocks
   * within conditional statements and loops.
   */
  #incrementStatementStack() {
    this.#statementStacks.unshift([]);
  }

  /**
   * Pops and returns the first array of statements from the statement stack.
   * This method is used when exiting a block of statements, allowing the collected
   * statements within that block to be processed or attached to the appropriate AST node.
   * @returns {Array} The array of statements that was at the beginning of the statement stack.
   */
  #popDecrementStatementStack() {
    return this.#statementStacks.shift();
  }

  /**
   * Pushes a given statement into the current statement collection.
   * If in "if mode", the statement is added to the current block of if statements;
   * otherwise, it's added to the main statements array.
   * @param {Object} statement - The AST node representing the statement to be added.
   */
  #pushStatement(statement) {
    if (this.#blockNestingLevel > 0) {
      this.#statementStacks[0].push(statement);
    } else {
      this.#statements.push(statement);
    }
  }

  /**
   * Sets the state of the AST transformation to accumulate tokens for a specific AST node type.
   * The number of tokens to collect is determined based on the next state.
   * @param {string} nextState - The state to transition to, which determines the type of AST node being built.
   */
  #setAccumulateState(nextState) {
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
  #createBinaryExpression(leftToken, operatorToken, rightToken) {
    const left = this.#tokenToBabelValue(leftToken);
    const right = this.#tokenToBabelValue(rightToken);
    const binaryExpression = t.binaryExpression(operatorToken.value, left, right);
    binaryExpression.loc = {
      start: { line: leftToken.line, column: leftToken.column },
      end: { line: rightToken.line, column: rightToken.column + rightToken.value.toString().length - 1 },
    };
    return binaryExpression;
  }

  /**
   * Converts a token to a Babel AST node for identifier, number, or string literals.
   * @param {Object} token - The token to convert.
   * @returns {Object} The corresponding Babel AST node.
   * @throws {ASTError} If the token type is not supported.
   */
  #tokenToBabelValue(token) {
    let node;
    if (token.type === TokenType.identifier) {
      node = t.identifier(token.value);
    } else if (token.type === TokenType.number) {
      node = t.numericLiteral(token.value);
    } else if (token.type === TokenType.string) {
      node = t.stringLiteral(token.value);
    } else {
      throw new ASTError(
        `Unsupported token type for value: ${token.type} at line ${token.line}, column ${token.column}`,
      );
    }
    node.loc = {
      start: { line: token.line, column: token.column },
      end: { line: token.line, column: token.column + token.value.toString().length - 1 },
    };
    return node;
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
        this.#setAccumulateState(ASTState.variableDeclaration);
      } else if (token.value === 'assign') {
        // assign variable
        this.#currentTokens.push(token);
        this.#setAccumulateState(ASTState.variableAssignment);
      } else if (token.value === 'print') {
        // call function to print data
        this.#currentTokens.push(token);
        this.#setAccumulateState(ASTState.print);
      } else if (token.value === 'as') {
        this.#currentTokens.push(token);
        this.#setAccumulateState(ASTState.asStatement);
        this.#blockNestingLevel++;
        this.#incrementStatementStack();
      } else if (token.value === 'repeat') {
        this.#blockNestingLevel--;
        const stackStatements = this.#popDecrementStatementStack();
        const binaryExpression = stackStatements.shift();
        const blockStatement = t.blockStatement(stackStatements);
        const whileStatement = t.whileStatement(binaryExpression, blockStatement);
        whileStatement.loc = {
          start: binaryExpression.loc.start,
          end: { line: token.line, column: token.column + 5 },
        };
        this.#pushStatement(whileStatement);
        this.#state = ASTState.initial;
        this.#currentTokens = [];
      } else if (token.value === 'if') {
        this.#currentTokens.push(token);
        this.#setAccumulateState(ASTState.ifStatement);
        this.#blockNestingLevel++;
        this.#incrementStatementStack();
      } else if (token.value === 'endif') {
        this.#blockNestingLevel--;
        const stackStatements = this.#popDecrementStatementStack();
        const binaryExpression = stackStatements.shift();
        const blockStatement = t.blockStatement(stackStatements);
        const ifStatement = t.ifStatement(binaryExpression, blockStatement);
        ifStatement.loc = {
          start: binaryExpression.loc.start,
          end: { line: token.line, column: token.column + 4 },
        };
        this.#pushStatement(ifStatement);
        this.#state = ASTState.initial;
        this.#currentTokens = [];
      }
    } else if (token.type === TokenType.identifier) {
      // assignment expression
      this.#currentTokens.push(token);
      this.#setAccumulateState(ASTState.assignmentExpression);
    }
  }

  /**
   * Handles the variableDeclaration state.
   */
  #handleVariableDeclaration() {
    const identifierToken = this.#currentTokens[1];
    const literalToken = this.#currentTokens[2];
    if (identifierToken.type !== TokenType.identifier) {
      throw new ASTError(
        `Invalid variableDeclaration. Expected identifier at line ${identifierToken.line}, column ${identifierToken.column}.`,
      );
    }
    if (literalToken.type !== TokenType.string && literalToken.type !== TokenType.number) {
      throw new ASTError(
        `Invalid variableDeclaration. Expected number or string at line ${literalToken.line}, column ${literalToken.column}.`,
      );
    }

    const identifier = t.identifier(identifierToken.value);
    identifier.loc = {
      start: { line: identifierToken.line, column: identifierToken.column },
      end: { line: identifierToken.line, column: identifierToken.column + identifierToken.value.length - 1 },
    };

    let value;
    if (literalToken.type === TokenType.string) {
      value = t.stringLiteral(literalToken.value);
    } else if (literalToken.type === TokenType.number) {
      value = t.numericLiteral(literalToken.value);
    }
    value.loc = {
      start: { line: literalToken.line, column: literalToken.column },
      end: { line: literalToken.line, column: literalToken.column + literalToken.value.toString().length - 1 },
    };

    const variableDeclarator = t.variableDeclarator(identifier, value);
    const variableDeclaration = t.variableDeclaration('let', [variableDeclarator]);
    variableDeclaration.loc = {
      start: { line: this.#currentTokens[0].line, column: this.#currentTokens[0].column },
      end: { line: literalToken.line, column: literalToken.column + literalToken.value.toString().length - 1 },
    };
    this.#pushStatement(variableDeclaration);

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
      throw new ASTError(
        `Invalid variableAssignment. Expected identifier at line ${identifierToken.line}, column ${identifierToken.column}.`,
      );
    }

    const identifier = t.identifier(identifierToken.value);
    identifier.loc = {
      start: { line: identifierToken.line, column: identifierToken.column },
      end: { line: identifierToken.line, column: identifierToken.column + identifierToken.value.length - 1 },
    };

    const value = this.#tokenToBabelValue(literalToken);
    value.loc = {
      start: { line: literalToken.line, column: literalToken.column },
      end: { line: literalToken.line, column: literalToken.column + literalToken.value.toString().length - 1 },
    };

    const assignmentExpression = t.assignmentExpression('=', identifier, value);
    assignmentExpression.loc = {
      start: { line: this.#currentTokens[0].line, column: this.#currentTokens[0].column },
      end: { line: literalToken.line, column: literalToken.column + literalToken.value.toString().length - 1 },
    };
    const expressionStatement = t.expressionStatement(assignmentExpression);
    expressionStatement.loc = assignmentExpression.loc;
    this.#pushStatement(expressionStatement);

    this.#state = ASTState.initial;
    this.#currentTokens = [];
  }

  /**
   * Handles the assignmentExpression state.
   */
  #handleAssignmentExpression() {
    const assignIdentifierToken = this.#currentTokens[0];
    const identifier = t.identifier(assignIdentifierToken.value);
    identifier.loc = {
      start: { line: assignIdentifierToken.line, column: assignIdentifierToken.column },
      end: {
        line: assignIdentifierToken.line,
        column: assignIdentifierToken.column + assignIdentifierToken.value.length - 1,
      },
    };

    const leftToken = this.#currentTokens[2];
    const operatorToken = this.#currentTokens[3];
    const rightToken = this.#currentTokens[4];

    const binaryExpression = this.#createBinaryExpression(leftToken, operatorToken, rightToken);
    binaryExpression.loc = {
      start: { line: leftToken.line, column: leftToken.column },
      end: { line: rightToken.line, column: rightToken.column + rightToken.value.toString().length - 1 },
    };

    const assignmentExpression = t.assignmentExpression('=', identifier, binaryExpression);
    assignmentExpression.loc = {
      start: { line: assignIdentifierToken.line, column: assignIdentifierToken.column },
      end: { line: rightToken.line, column: rightToken.column + rightToken.value.toString().length - 1 },
    };
    const expressionStatement = t.expressionStatement(assignmentExpression);
    expressionStatement.loc = assignmentExpression.loc;

    this.#pushStatement(expressionStatement);

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

    const binaryExpression = this.#createBinaryExpression(leftToken, operatorToken, rightToken);
    this.#pushStatement(binaryExpression);
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

    const binaryExpression = this.#createBinaryExpression(leftToken, operatorToken, rightToken);
    this.#pushStatement(binaryExpression);
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
    identifierConsole.loc = {
      start: { line: valueToken.line, column: valueToken.column }, // approximate
      end: { line: valueToken.line, column: valueToken.column + 6 },
    };
    const identifierLog = t.identifier('log');
    identifierLog.loc = {
      start: { line: valueToken.line, column: valueToken.column + 7 },
      end: { line: valueToken.line, column: valueToken.column + 10 },
    };

    const memberExpression = t.memberExpression(identifierConsole, identifierLog);
    memberExpression.loc = {
      start: { line: valueToken.line, column: valueToken.column },
      end: { line: valueToken.line, column: valueToken.column + 10 },
    };
    const callExpression = t.callExpression(memberExpression, [value]);
    callExpression.loc = {
      start: { line: this.#currentTokens[0].line, column: this.#currentTokens[0].column },
      end: { line: valueToken.line, column: valueToken.column + valueToken.value.toString().length - 1 },
    };
    const expressionStatement = t.expressionStatement(callExpression);
    expressionStatement.loc = callExpression.loc;

    this.#pushStatement(expressionStatement);

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
  async process(tokenizerGen) {
    for await (const token of tokenizerGen) {
      // console.log('AST:' + JSON.stringify(token));

      if (this.#tokensToCollect > 0) {
        this.#currentTokens.push(token);
        this.#tokensToCollect--;
        if (this.#tokensToCollect > 0) {
          continue;
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
    }

    // Flush
    const program = t.program(this.#statements, [], 'script');
    const file = t.file(program);
    const cg = new CodeGenerator(file);

    let nodeCount = 0;
    traverse(cg._ast, {
      enter() {
        nodeCount++;
      },
    });
    this.astNodeCount = nodeCount;

    const output = cg.generate({ sourceMaps: true });
    return {
      code: output.code,
      astNodeCount: nodeCount,
    };
  }
}
