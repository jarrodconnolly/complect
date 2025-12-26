/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import { Preprocessor } from './preprocessing/preprocessor.js';
import { Tokenizer } from './tokenizer/tokenizer.js';
import { ASTBuilder } from './ast/ast-builder.js';
import { BabelTranslator } from './babel-ast/babel-translator.js';

export async function compile(inputStream) {
  const preprocessor = new Preprocessor();
  const tokenizer = new Tokenizer();
  const astBuilder = new ASTBuilder();
  const babelTranslator = new BabelTranslator();

  const preprocessorGen = preprocessor.process(inputStream);
  const tokenizerGen = tokenizer.process(preprocessorGen);
  const ir = await astBuilder.build(tokenizerGen);
  const result = babelTranslator.translate(ir);

  return {
    code: result.code,
    ir,
    preprocessorTokenCount: preprocessor.tokenCount,
    tokenCount: tokenizer.tokenCount,
    astNodeCount: result.astNodeCount,
  };
}

