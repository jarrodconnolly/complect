#!/usr/bin/env node
/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
 */
import { createReadStream, createWriteStream } from 'node:fs';
import { parseArgs } from 'node:util';
import { compile } from '../lib/compiler.js';
import { pretty } from '../lib/util/pretty-hrtime.js';

const parsedArgs = parseArgs({
  options: {
    help: {
      type: 'boolean',
      short: 'h',
      default: false,
    },
    backend: {
      type: 'string',
      short: 'b',
      default: 'babel',
    },
    file: {
      type: 'string',
      short: 'f',
      default: '',
    },
    output: {
      type: 'string',
      short: 'o',
      default: '',
    },
  },
});

if (parsedArgs.values.help) {
  console.log(`Complect Compiler CLI

Usage: complect [options]

Options:
  -h, --help          Show help information
  -b, --backend      Specify the backend to use (default: babel)
  -f, --file         Input source file (default: stdin)
  -o, --output       Output file (default: stdout)
`);
  process.exit(0);
}

const backend = parsedArgs.values.backend;
const file = parsedArgs.values.file;
const output = parsedArgs.values.output;

console.log(`Backend: ${backend}`);
if (file) {
  console.log(`Compiling: ${file}`);
}
if (output) {
  console.log(`Output: ${output}`);
}

const inputStream = file ? createReadStream(file) : process.stdin;
const outputStream = output ? createWriteStream(output) : process.stdout;

const start = process.hrtime.bigint();
compile(inputStream, backend)
  .then((results) => {
    const end = process.hrtime.bigint();
    const totalTime = pretty(end - start);
    const message = `Total Time: ${totalTime} PreTokens: ${results.preprocessorTokenCount} Tokens: ${results.tokenCount} AST Nodes: ${results.astNodeCount} `;

    if (backend === 'llvm') {
      outputStream.write(`; ${message}\n\n`);
      outputStream.write(results.code);
    } else {
      outputStream.write(`// ${message}\n\n`);
      outputStream.write(results.code);
    }

    outputStream.end();
  })
  .catch((err) => {
    console.error(err);
  });
