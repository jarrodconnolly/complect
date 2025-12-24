/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import { parse } from '@babel/parser';
//import generate from '@babel/generator';

const code = 'console.log(foo);';
const ast = parse(code);
console.log(JSON.stringify(ast, null, 2));
// const output = generate(
//   ast,
//   {
//     /* options */
//   },
//   code
// );