/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * GNU General Public License v3.0 (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)
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

  // toString() {
  //   return this.name;
  // }
}
