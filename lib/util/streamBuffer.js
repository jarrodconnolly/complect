/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * GNU General Public License v3.0 (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)
*/
import { Writable } from 'stream';

export class StreamBuffer extends Writable {
  buffer;
  constructor() {
    super();
    this.buffer = '';
  }
  _write(chunk, enc, next) {
    this.buffer += chunk.toString();
    next();
  }
}