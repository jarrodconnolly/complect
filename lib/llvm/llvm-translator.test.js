/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import { describe, it } from "node:test";
import assert from "node:assert";

import { LLVMTranslator } from "./llvm-translator.js";
import { Program, VariableDeclaration, FunctionDeclaration, ReturnStatement, CallStatement, Identifier, NumericLiteral } from "../ast/ir-nodes.js";

describe('LLVMTranslator', () => {
  it('translates function declaration', () => {
    const ir = new Program([
      new FunctionDeclaration('double', ['n'], [
        new VariableDeclaration('result', new NumericLiteral(42, { start: { line: 2, column: 5 }, end: { line: 2, column: 7 } }), { start: { line: 2, column: 1 }, end: { line: 2, column: 7 } }),
        new ReturnStatement('result', { start: { line: 3, column: 3 }, end: { line: 3, column: 10 } })
      ], { start: { line: 1, column: 1 }, end: { line: 4, column: 1 } })
    ], null);

    const translator = new LLVMTranslator();
    const result = translator.translate(ir);

    // Check that the LLVM IR contains the function definition
    assert(result.includes('define internal i32 @double'));
    assert(result.includes('ret i32'));
  });

  it('translates call statement with result', () => {
    const ir = new Program([
      new FunctionDeclaration('double', ['n'], [
        new VariableDeclaration('result', new NumericLiteral(42, { start: { line: 2, column: 5 }, end: { line: 2, column: 7 } }), { start: { line: 2, column: 1 }, end: { line: 2, column: 7 } }),
        new ReturnStatement('result', { start: { line: 3, column: 3 }, end: { line: 3, column: 10 } })
      ], { start: { line: 1, column: 1 }, end: { line: 4, column: 1 } }),
      new VariableDeclaration('x', new NumericLiteral(10, { start: { line: 5, column: 1 }, end: { line: 5, column: 1 } }), { start: { line: 5, column: 1 }, end: { line: 5, column: 1 } }),
      new VariableDeclaration('result', new NumericLiteral(0, { start: { line: 6, column: 1 }, end: { line: 6, column: 1 } }), { start: { line: 6, column: 1 }, end: { line: 6, column: 1 } }),
      new CallStatement('double', [new Identifier('x', { start: { line: 7, column: 13 }, end: { line: 7, column: 13 } })], 'result', { start: { line: 7, column: 1 }, end: { line: 7, column: 15 } })
    ], null);

    const translator = new LLVMTranslator();
    const result = translator.translate(ir);

    // Check that the LLVM IR contains a call instruction
    assert(result.includes('call i32 @double'));
    assert(result.includes('store i32 %call, i32* %result'));
  });
});