/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
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