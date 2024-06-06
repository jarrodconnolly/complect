/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * GNU General Public License v3.0 (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)
*/
import { describe, it } from "node:test";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import assert from "node:assert";

import { Preprocessor } from '../preprocessing/preprocessor.js';
import { Tokenizer } from '../tokenizer/tokenizer.js';
import { BabelAST } from './babel-ast.js';
import { StreamBuffer } from '../util/streamBuffer.js';

async function testStream(input) {
  const preprocessor = new Preprocessor();
  const tokenizer = new Tokenizer();
  const babelAST = new BabelAST();
  const streamBuffer = new StreamBuffer();
  function* test() {yield input;}
  const readableStream = Readable.from(test(), {encoding: 'utf8'});
  await pipeline(
    readableStream,
    preprocessor,
    tokenizer,
    babelAST,
    streamBuffer
  );
  return streamBuffer.buffer;
}

describe('BabelAST', () => {
  it('variableDeclaration', async () => {
    const result = await testStream('make i 1');
    assert.strictEqual(result, 'let i = 1;');
  });
});