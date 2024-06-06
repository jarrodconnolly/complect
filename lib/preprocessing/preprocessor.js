/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * GNU General Public License v3.0 (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)
*/
import { Transform } from 'node:stream';
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

export class Preprocessor extends Transform {
  #decoder;
  #state;
  #currentToken;
  tokenCount;
  constructor () {
    super({ readableObjectMode: true });
    this.streamName = 'Preprocessor';
    this.#decoder = new StringDecoder('utf-8');
    this.#state = PreprocessingState.initial;
    this.#currentToken = new PreprocessingToken();
    this.tokenCount = 0;
  }

  _resetToken() {
    this.#currentToken = new PreprocessingToken();
  }

  _sendToken() {
    this.tokenCount++;
    this.push(this.#currentToken);
    this._resetToken();
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

  _transform (data, encoding, callback) {
    const current = this.#decoder.write(data);
    let i = 0;
    while (i < current.length) {
      const ch = current[i];

      switch (this.#state) {
        case PreprocessingState.initial: {
          if (this.isWhitespace(ch)) {
            this.#state = PreprocessingState.whitespace;
            break;
          } else if (this.isDigit(ch)) {
            this.#state = PreprocessingState.number;
            this.#currentToken.type = PreprocessingTokenType.number;
            this.#currentToken.append(ch);
            break;
          } else if (this.isLineFeed(ch)) {
            this.#currentToken.type = PreprocessingTokenType.linefeed;
            this._sendToken();
            break;
          } else if (this.isLetter(ch)) {
            this.#currentToken.type = PreprocessingTokenType.identifier;
            this.#state = PreprocessingState.identifier;
            this.#currentToken.append(ch);
            break;
          } else if (this.isOperator(ch)) {
            this.#state = PreprocessingState.operator;
            this.#currentToken.append(ch);
            break;
          } else if (this.isQuote(ch)) {
            this.#state = PreprocessingState.string;
            this.#currentToken.append(ch);
            break;
          } else {
            this.#currentToken.type = PreprocessingTokenType.unknown;
            this.#currentToken.append(ch);
            this._sendToken();
            break;
          }
        }
        case PreprocessingState.operator: {
          if(this.isOperator(ch)) {
            this.#currentToken.append(ch);
            break;
          }

          this.#currentToken.type = PreprocessingTokenType.operator;
          this._sendToken();
          this.#state = PreprocessingState.initial;
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
            this._sendToken();
            this.#state = PreprocessingState.initial;
          }
          break;
        }
        case PreprocessingState.whitespace: {
          if (this.isWhitespace(ch)) {
            break;
          }

          this.#currentToken.type = PreprocessingTokenType.whitespace;
          this._sendToken();
          this.#state = PreprocessingState.initial;
          i--;
          break;
        }
        case PreprocessingState.identifier: {
          if (this.isLetter(ch) || this.isDigit(ch)) {
            this.#currentToken.append(ch);
            break;
          }

          //this.#currentToken.type = PreprocessingTokenType.identifier;
          this._sendToken();
          this.#state = PreprocessingState.initial;
          i--;
          break;
        }
        case PreprocessingState.number: {
          if (this.isDigit(ch)) {
            this.#currentToken.append(ch);
            break;
          }

          this._sendToken();
          this.#state = PreprocessingState.initial;
          i--;
          break;
        }
        default: {
          this.destroy(new PreprocessingError('unknown scanner state'));
        }
      }

      i++;
    }

    return callback();
  }

  _flush(callback) {
    if(this.#currentToken.value.length > 0 ) {
      this._sendToken();
    }
    this.#currentToken = new PreprocessingToken(PreprocessingTokenType.eof);
    this._sendToken();
    return callback();
  }
}
