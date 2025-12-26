#!/usr/bin/env node
/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import { compile } from '../lib/compiler.js';
import { pretty } from '../lib/util/pretty-hrtime.js';

const args = process.argv.slice(2);
let backend = 'babel';

if (args.length > 0 && args[0] === '--backend') {
  backend = args[1];
  // Remove the backend args
  process.argv.splice(2, 2);
}

const inputStream = process.stdin;

const start = process.hrtime.bigint();
compile(inputStream, backend)
  .then((results) => {
    const end = process.hrtime.bigint();
    const totalTime = pretty(end - start);
    const message = `Total Time: ${totalTime} PreTokens: ${results.preprocessorTokenCount} Tokens: ${results.tokenCount} AST Nodes: ${results.astNodeCount} `;
    
    if (backend === 'llvm') {
      console.log(`; ${message}`);
    } else {
      console.log(`// ${message}`);
    }
    console.log(`\n${results.code}`);
  })
  .catch((err) => {
    console.error(err);
  });
