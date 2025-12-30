/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
 */
import { PreprocessingTokenType } from '../preprocessing/preprocessing-token-type.js';
import { keywords } from './keywords.js';
import { operators } from './operators.js';
import { Token } from './token.js';
import { TokenType } from './token-type.js';

export class TokenizerError extends Error {}

export class Tokenizer {
  #tokenCount;
  #keywords;
  #operators;
  constructor() {
    this.streamName = 'Tokenizer';
    this.#tokenCount = 0;
    this.#keywords = new Set(keywords);
    this.#operators = new Set(operators);
  }

  get tokenCount() {
    return this.#tokenCount;
  }

  _createToken(type, value, line, column) {
    const token = new Token(type, value, line, column);
    this.#tokenCount++;
    return token;
  }

  async *process(preprocessorGen) {
    for await (const preprocessingToken of preprocessorGen) {
      switch (preprocessingToken.type) {
        case PreprocessingTokenType.identifier: {
          const tokenType = this.#keywords.has(preprocessingToken.value) ? TokenType.keyword : TokenType.identifier;
          yield this._createToken(
            tokenType,
            preprocessingToken.value,
            preprocessingToken.line,
            preprocessingToken.column,
          );
          break;
        }
        case PreprocessingTokenType.operator: {
          if (!this.#operators.has(preprocessingToken.value)) {
            throw new TokenizerError(
              `Invalid operator: ${preprocessingToken.value} at line ${preprocessingToken.line}, column ${preprocessingToken.column}`,
            );
          }
          yield this._createToken(
            TokenType.operator,
            preprocessingToken.value,
            preprocessingToken.line,
            preprocessingToken.column,
          );
          break;
        }
        case PreprocessingTokenType.number: {
          const value = Number(preprocessingToken.value);
          if (Number.isNaN(value)) {
            throw new TokenizerError(
              `Invalid number: ${preprocessingToken.value} at line ${preprocessingToken.line}, column ${preprocessingToken.column}`,
            );
          }
          yield this._createToken(TokenType.number, value, preprocessingToken.line, preprocessingToken.column);
          break;
        }
        case PreprocessingTokenType.string: {
          const value = preprocessingToken.value.replaceAll("'", '').replaceAll('"', '');
          yield this._createToken(TokenType.string, value, preprocessingToken.line, preprocessingToken.column);
          break;
        }
      }
    }
  }
}
