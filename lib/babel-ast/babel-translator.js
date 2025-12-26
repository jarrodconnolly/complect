/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/

import * as t from '@babel/types';
import { CodeGenerator } from '@babel/generator';
import _traverse from "@babel/traverse";
const traverse = _traverse.default;

import { VariableDeclaration, AssignmentExpression, BinaryExpression, IfStatement, WhileStatement, PrintStatement, Identifier, NumericLiteral, StringLiteral } from '../ast/ir-nodes.js';

export class BabelTranslator {
  translate(ir) {
    const program = this.translateProgram(ir);
    const file = t.file(program);
    const cg = new CodeGenerator(file);

    let nodeCount = 0;
    traverse(cg._ast, {
      enter() {
        nodeCount++;
      }
    });

    const output = cg.generate({ sourceMaps: true });
    return {
      code: output.code,
      astNodeCount: nodeCount
    };
  }

  translateProgram(program) {
    const statements = program.statements.map(s => this.translateStatement(s));
    return t.program(statements, [], 'script');
  }

  translateStatement(stmt) {
    if (stmt instanceof VariableDeclaration) {
      const id = t.identifier(stmt.identifier);
      id.loc = stmt.loc;
      const init = this.translateExpression(stmt.value);
      const declarator = t.variableDeclarator(id, init);
      const decl = t.variableDeclaration('let', [declarator]);
      decl.loc = stmt.loc;
      return decl;
    } else if (stmt instanceof AssignmentExpression) {
      const left = t.identifier(stmt.left);
      left.loc = stmt.loc;
      const right = this.translateExpression(stmt.right);
      const assign = t.assignmentExpression('=', left, right);
      assign.loc = stmt.loc;
      return t.expressionStatement(assign);
    } else if (stmt instanceof IfStatement) {
      const test = this.translateExpression(stmt.test);
      const consequent = t.blockStatement(stmt.consequent.map(s => this.translateStatement(s)));
      const ifStmt = t.ifStatement(test, consequent);
      ifStmt.loc = stmt.loc;
      return ifStmt;
    } else if (stmt instanceof WhileStatement) {
      const test = this.translateExpression(stmt.test);
      const body = t.blockStatement(stmt.body.map(s => this.translateStatement(s)));
      const whileStmt = t.whileStatement(test, body);
      whileStmt.loc = stmt.loc;
      return whileStmt;
    } else if (stmt instanceof PrintStatement) {
      const arg = this.translateExpression(stmt.argument);
      const consoleId = t.identifier('console');
      consoleId.loc = stmt.loc;
      const logId = t.identifier('log');
      const member = t.memberExpression(consoleId, logId);
      const call = t.callExpression(member, [arg]);
      const exprStmt = t.expressionStatement(call);
      exprStmt.loc = stmt.loc;
      return exprStmt;
    } else {
      throw new Error(`Unknown statement type: ${stmt.constructor.name}`);
    }
  }

  translateExpression(expr) {
    if (expr instanceof Identifier) {
      const id = t.identifier(expr.name);
      id.loc = expr.loc;
      return id;
    } else if (expr instanceof NumericLiteral) {
      const num = t.numericLiteral(expr.value);
      num.loc = expr.loc;
      return num;
    } else if (expr instanceof StringLiteral) {
      const str = t.stringLiteral(expr.value);
      str.loc = expr.loc;
      return str;
    } else if (expr instanceof BinaryExpression) {
      const left = this.translateExpression(expr.left);
      const right = this.translateExpression(expr.right);
      const bin = t.binaryExpression(expr.operator, left, right);
      bin.loc = expr.loc;
      return bin;
    } else {
      throw new Error(`Unknown expression type: ${expr.constructor.name}`);
    }
  }
}