/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import { Transform } from 'node:stream';
import { PreprocessingTokenType } from '../preprocessing/preprocessing-token-type.js';
import { keywords } from './keywords.js';
import { operators } from './operators.js';
import { Token } from './token.js';
import { TokenType } from './token-type.js';

export class TokenizerError extends Error {
  constructor (message) {super(message);}
}

export class Tokenizer extends Transform {
  #tokenCount;
  #keywords;
  #operators;
  constructor () {
    super({ objectMode: true });
    this.streamName = 'Tokenizer';
    this.#tokenCount = 0;
    this.#keywords = new Set(keywords);
    this.#operators = new Set(operators);
  }

  get tokenCount() {
    return this.#tokenCount;
  }

  _createAndSendToken(type, value, line, column) {
    const token = new Token(type, value, line, column);
    this.#tokenCount++;
    this.push(token);
  }

  _transform (preprocessingToken, encoding, callback) {
    try {
      switch(preprocessingToken.type) {
        case PreprocessingTokenType.identifier: {
          const tokenType = this.#keywords.has(preprocessingToken.value) ? TokenType.keyword : TokenType.identifier;
          this._createAndSendToken(tokenType, preprocessingToken.value, preprocessingToken.line, preprocessingToken.column);
          break;
        }
        case PreprocessingTokenType.operator: {
          if(!this.#operators.has(preprocessingToken.value)) {
            this.destroy(new TokenizerError(`Invalid operator: ${preprocessingToken.value} at line ${preprocessingToken.line}, column ${preprocessingToken.column}`));
          }
          this._createAndSendToken(TokenType.operator, preprocessingToken.value, preprocessingToken.line, preprocessingToken.column);
          break;
        }
        case PreprocessingTokenType.number: {
          const value = Number(preprocessingToken.value);
          if(isNaN(value)) {
            this.destroy(new TokenizerError(`Invalid number: ${preprocessingToken.value} at line ${preprocessingToken.line}, column ${preprocessingToken.column}`));
          }
          this._createAndSendToken(TokenType.number, value, preprocessingToken.line, preprocessingToken.column);
          break;
        }
        case PreprocessingTokenType.string: {
          const value = preprocessingToken.value.replaceAll('\'', '');
          this._createAndSendToken(TokenType.string, value, preprocessingToken.line, preprocessingToken.column);
          break;
        }
      }
      callback();
    } catch (err) {
      callback(err);
    }
  }
}