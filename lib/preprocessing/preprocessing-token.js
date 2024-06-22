/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * GNU General Public License v3.0 (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)
*/
import { PreprocessingTokenType } from './preprocessing-token-type.js';

export class PreprocessingToken {
  constructor (type = PreprocessingTokenType.none, value = '') {
    this.value = value;
    this.type = type;
    this.line = 0;
    this.column = 0;
  }
  append(ch) {
    this.value += ch;
  }
  toString() {
    return `${this.type} ${this.value}`;
  }
}

