/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * GNU General Public License v3.0 (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)
*/
import { pipeline } from 'node:stream/promises';
import { Preprocessor } from './preprocessing/preprocessor.js';
import { Tokenizer } from './tokenizer/tokenizer.js';
import { BabelAST } from './babel-ast/babel-ast.js';
import { StreamBuffer } from './util/streamBuffer.js';

export async function compile(inputStream) {
  const preprocessor = new Preprocessor();
  const tokenizer = new Tokenizer();
  const babelAST = new BabelAST();
  const streamBuffer = new StreamBuffer();
  
  try{
  await pipeline(
    inputStream,
    preprocessor,
    tokenizer,
    babelAST,
    streamBuffer,
  );
} catch (error) {
  console.error('An error occurred during the compilation process:', error);
}

  return {
    code: streamBuffer.buffer,
    preprocessorTokenCount: preprocessor.tokenCount,
    tokenCount: tokenizer.tokenCount,
    astNodeCount: babelAST.astNodeCount,
  };
}

