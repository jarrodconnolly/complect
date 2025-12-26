/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
export class TokenType {
  static keyword = new TokenType('keyword');
  static operator = new TokenType('operator');
  static identifier = new TokenType('identifier');
  static number = new TokenType('number');
  static string = new TokenType('string');
  static invalid = new TokenType('invalid');

  constructor(name) {
    this.name = name;
  }

  toString() {
    return this.name;
  }
}
