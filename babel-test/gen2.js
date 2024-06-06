/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * GNU General Public License v3.0 (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)
*/
// { parse } from '@babel/parser';
import {CodeGenerator} from '@babel/generator';
import * as t from '@babel/types';

//const code = "let foo = 'bar'";
//const ast = parse(code);

const identifierFoo = t.identifier('foo');
const stringLiteralBar = t.stringLiteral('bar');
const variableDeclarator = t.variableDeclarator(identifierFoo, stringLiteralBar);

const variableDeclaration = t.variableDeclaration('let', [variableDeclarator]);

const program = t.program([variableDeclaration], [], 'script');
const file = t.file(program);
const output = new CodeGenerator(file).generate();

console.log(output.code);