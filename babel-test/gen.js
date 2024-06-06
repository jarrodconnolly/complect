/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * GNU General Public License v3.0 (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)
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