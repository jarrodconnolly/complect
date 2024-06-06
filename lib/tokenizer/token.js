/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * GNU General Public License v3.0 (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)
*/
import { TokenType } from './token-type.js';

export class Token {
  constructor (type = TokenType.none, value = '') {
    this.value = value;
    this.type = type;
  }
  // append(ch) {
  //   this.value += ch;
  // }
  // toString() {
  //   return `${this.type} ${this.value}`;
  // }
}

