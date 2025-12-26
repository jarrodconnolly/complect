/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import { Preprocessor } from './preprocessing/preprocessor.js';
import { Tokenizer } from './tokenizer/tokenizer.js';
import { ASTBuilder } from './ast/ast-builder.js';

export async function compile(inputStream) {
  const preprocessor = new Preprocessor();
  const tokenizer = new Tokenizer();
  const astBuilder = new ASTBuilder();

  const preprocessorGen = preprocessor.process(inputStream);
  const tokenizerGen = tokenizer.process(preprocessorGen);
  const ir = await astBuilder.build(tokenizerGen);

  return {
    ir,
    preprocessorTokenCount: preprocessor.tokenCount,
    tokenCount: tokenizer.tokenCount,
  };
}

