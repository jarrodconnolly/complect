/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * GNU General Public License v3.0 (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)
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
