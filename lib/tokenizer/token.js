/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import { TokenType } from './token-type.js';

export class Token {
  constructor (type = TokenType.none, value = '', line = 0, column = 0) {
    this.value = value;
    this.type = type;
    this.line = line;
    this.column = column;
  }
  // append(ch) {
  //   this.value += ch;
  // }
  toString() {
    return `${this.type} ${this.value}`;
  }
}

