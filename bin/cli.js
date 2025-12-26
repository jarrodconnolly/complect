#!/usr/bin/env node
/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import { compile } from '../lib/compiler.js';
import { pretty } from '../lib/util/pretty-hrtime.js';

const inputStream = process.stdin;

const start = process.hrtime.bigint();
compile(inputStream)
  .then((results) => {
    const end = process.hrtime.bigint();
    const totalTime = pretty(end - start);
    const message = `Total Time: ${totalTime} PreTokens: ${results.preprocessorTokenCount} Tokens: ${results.tokenCount} AST Nodes: ${results.astNodeCount} `;
    console.log(`// ${message}`);
    console.log(`\n${results.code}`);
  })
  .catch((err) => {
    console.error(err);
  });
