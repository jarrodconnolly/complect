/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import { StringDecoder } from 'node:string_decoder';
import { PreprocessingToken } from './preprocessing-token.js';
import { PreprocessingTokenType } from './preprocessing-token-type.js';

class PreprocessingError extends Error {
  constructor (message) {super(message);}
}

class PreprocessingState {
  static initial = new PreprocessingState('initial');
  static number = new PreprocessingState('number');
  static whitespace = new PreprocessingState('whitespace');
  static identifier = new PreprocessingState('identifier');
  static string = new PreprocessingState('string');
  static operator = new PreprocessingState('operator');

  constructor(name) {
    this.name = name;
  }
}

export class Preprocessor {
  #decoder;
  #state;
  #currentToken;
  #line;
  #column;
  tokenCount;
  constructor () {
    this.streamName = 'Preprocessor';
    this.#decoder = new StringDecoder('utf-8');
    this.#state = PreprocessingState.initial;
    this.#currentToken = new PreprocessingToken();
    this.tokenCount = 0;
    this.#line = 1;
    this.#column = 1;
    this.#resetToken();
  }

  #resetToken() {
    this.#currentToken = new PreprocessingToken();
  }

  #sendToken() {
    this.tokenCount++;
    return this.#currentToken;  // Return instead of callback
  }

  #finalizeCurrentToken() {
    switch (this.#state) {
      case PreprocessingState.whitespace:
        this.#currentToken.type = PreprocessingTokenType.whitespace;
        break;
      case PreprocessingState.string:
        this.#currentToken.type = PreprocessingTokenType.string;
        break;
      case PreprocessingState.operator:
        this.#currentToken.type = PreprocessingTokenType.operator;
        break;
      // identifier and number already have type set
    }
    return this.#sendToken();
  }

  isWhitespace(c) {
    return c === ' ' || c === '\t';
  }

  isDigit(c) {
    return c >= '0' && c <= '9';
  }

  isStringAllowable(c) {
    return (c >= '!' && c <= '&')
      || (c >= '(' && c <= '/')
      || (c >= ':' && c <= '@')
      || (c >= '[' && c <= '`')
      || (c >= '{' && c <= '~');
  }

  isLetter(c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
  }

  isLineFeed(c) {
    return c === '\n';
  }

  isQuote(c) {
    return c === '\'';
  }

  isOperator(c) {
    const operators = ['+', '-', '*', '/', '=', '<', '>', '%'];
    return operators.includes(c);
  }

  async *process(chunkIterable) {
    for await (const chunk of chunkIterable) {
      const current = this.#decoder.write(chunk);
      let i = 0;
      let incrementCol = true;
      while (i < current.length) {
        const ch = current[i];
        incrementCol = true;

        switch (this.#state) {
          case PreprocessingState.initial: {
            if (this.isWhitespace(ch)) {
              this.#currentToken.line = this.#line;
              this.#currentToken.column = this.#column;
              this.#state = PreprocessingState.whitespace;
              break;
            } else if (this.isDigit(ch)) {
              this.#currentToken.line = this.#line;
              this.#currentToken.column = this.#column;
              this.#state = PreprocessingState.number;
              this.#currentToken.type = PreprocessingTokenType.number;
              this.#currentToken.append(ch);
              break;
            } else if (this.isLineFeed(ch)) {
              this.#currentToken.type = PreprocessingTokenType.linefeed;
              this.#currentToken.line = this.#line;
              this.#currentToken.column = this.#column;
              yield this.#sendToken();
              this.#resetToken();
              this.#line++;
              this.#column = 1;
              i++;
              continue;
            } else if (this.isLetter(ch)) {
              this.#currentToken.line = this.#line;
              this.#currentToken.column = this.#column;
              this.#currentToken.type = PreprocessingTokenType.identifier;
              this.#state = PreprocessingState.identifier;
              this.#currentToken.append(ch);
              break;
            } else if (this.isOperator(ch)) {
              this.#currentToken.line = this.#line;
              this.#currentToken.column = this.#column;
              this.#state = PreprocessingState.operator;
              this.#currentToken.append(ch);
              break;
            } else if (this.isQuote(ch)) {
              this.#currentToken.line = this.#line;
              this.#currentToken.column = this.#column;
              this.#state = PreprocessingState.string;
              this.#currentToken.append(ch);
              break;
            } else {
              this.#currentToken.line = this.#line;
              this.#currentToken.column = this.#column;
              this.#currentToken.type = PreprocessingTokenType.unknown;
              this.#currentToken.append(ch);
              yield this.#sendToken();
              this.#resetToken();
              break;
            }
          }
          case PreprocessingState.operator: {
            if(this.isOperator(ch)) {
              this.#currentToken.append(ch);
              break;
            }

            yield this.#finalizeCurrentToken();
            this.#resetToken();
            this.#state = PreprocessingState.initial;
            incrementCol = false;
            i--;
            break;
          }
          case PreprocessingState.string: {
            if (this.isLetter(ch) 
                || this.isDigit(ch) 
                || this.isWhitespace(ch)
                || this.isStringAllowable(ch)) {
              this.#currentToken.append(ch);
              break;
            }
            if (this.isQuote(ch)) {
              this.#currentToken.append(ch);
              this.#currentToken.type = PreprocessingTokenType.string;
              yield this.#sendToken();
              this.#resetToken();
              this.#state = PreprocessingState.initial;
            }
            break;
          }
          case PreprocessingState.whitespace: {
            if (this.isWhitespace(ch)) {
              break;
            }

            yield this.#finalizeCurrentToken();
            this.#resetToken();
            this.#state = PreprocessingState.initial;
            incrementCol = false;
            i--;
            break;
          }
          case PreprocessingState.identifier: {
            if (this.isLetter(ch) || this.isDigit(ch)) {
              this.#currentToken.append(ch);
              break;
            }

            yield this.#finalizeCurrentToken();
            this.#resetToken();
            this.#state = PreprocessingState.initial;
            incrementCol = false;
            i--;
            break;
          }
          case PreprocessingState.number: {
            if (this.isDigit(ch)) {
              this.#currentToken.append(ch);
              break;
            }

            yield this.#finalizeCurrentToken();
            this.#resetToken();
            this.#state = PreprocessingState.initial;
            incrementCol = false;
            i--;
            break;
          }
          default: {
            throw new PreprocessingError('unknown scanner state');
          }
        }

        if (incrementCol) {
          this.#column++;
        }
        i++;
      }
    }

    if (this.#state !== PreprocessingState.initial) {
      yield this.#finalizeCurrentToken();
      this.#resetToken();
    }
    this.#currentToken = new PreprocessingToken(PreprocessingTokenType.eof);
    this.#currentToken.line = this.#line;
    this.#currentToken.column = this.#column;
    yield this.#sendToken();
    this.#resetToken();
  }
}
