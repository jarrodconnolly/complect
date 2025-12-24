/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import stream from 'stream';

export const stringify = new stream.Transform({
  writableObjectMode: true,
  allowHalfOpen: true,
  transform(obj, encoding, callback) {
    this.push(obj.toString() + '\n');
    callback();
  },
});
