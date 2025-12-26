/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import { Preprocessor } from './preprocessing/preprocessor.js';
import { Tokenizer } from './tokenizer/tokenizer.js';
import { BabelAST } from './babel-ast/babel-ast.js';

export async function compile(inputStream) {
  const preprocessor = new Preprocessor();
  const tokenizer = new Tokenizer();
  const babelAst = new BabelAST();

  const preprocessorGen = preprocessor.process(inputStream);
  const tokenizerGen = tokenizer.process(preprocessorGen);
  const astResult = await babelAst.process(tokenizerGen);

  return {
    code: astResult.code,
    preprocessorTokenCount: preprocessor.tokenCount,
    tokenCount: tokenizer.tokenCount,
    astNodeCount: astResult.astNodeCount,
  };
}

