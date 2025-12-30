/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
 */

import { ASTBuilder } from './ast/ast-builder.js';
import { BabelTranslator } from './babel-ast/babel-translator.js';
import { LLVMTranslator } from './llvm/llvm-translator.js';
import { Preprocessor } from './preprocessing/preprocessor.js';
import { Tokenizer } from './tokenizer/tokenizer.js';

export async function compile(inputStream, backend = 'babel') {
  const preprocessor = new Preprocessor();
  const tokenizer = new Tokenizer();
  const astBuilder = new ASTBuilder();

  const preprocessorGen = preprocessor.process(inputStream);
  const tokenizerGen = tokenizer.process(preprocessorGen);
  const ir = await astBuilder.build(tokenizerGen);

  let result;
  if (backend === 'llvm') {
    const llvmTranslator = new LLVMTranslator();
    result = { code: llvmTranslator.translate(ir), astNodeCount: 0 }; // TODO: count LLVM nodes
  } else {
    const babelTranslator = new BabelTranslator();
    result = babelTranslator.translate(ir);
  }

  return {
    code: result.code,
    ir,
    preprocessorTokenCount: preprocessor.tokenCount,
    tokenCount: tokenizer.tokenCount,
    astNodeCount: result.astNodeCount,
  };
}
