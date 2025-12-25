/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import { Preprocessor } from './preprocessing/preprocessor.js';
import { Tokenizer } from './tokenizer/tokenizer.js';

export async function compile(inputStream) {
  const preprocessor = new Preprocessor();
  const tokenizer = new Tokenizer();
  const tokens = [];
  
  preprocessor.onToken = (preToken) => {
    tokenizer.receiveToken(preToken);
  };
  tokenizer.onToken = (token) => {
    tokens.push(token);
  };

  return new Promise((resolve, reject) => {
    inputStream.on('data', (chunk) => {
      preprocessor.receiveChunk(chunk);
    });
    inputStream.on('end', () => {
      preprocessor.endInput();
      resolve({
        code: tokens.map(t => t.toString()).join('\n'),
        preprocessorTokenCount: preprocessor.tokenCount,
        tokenCount: tokenizer.tokenCount,
      });
    });
    inputStream.on('error', reject);
  });
}

