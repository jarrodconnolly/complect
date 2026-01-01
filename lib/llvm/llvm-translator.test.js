/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
 */
import { describe, it } from 'node:test';
import {
  ArrayAccess,
  ArrayAssignment,
  ArrayDeclaration,
  AssignmentExpression,
  BinaryExpression,
  CallStatement,
  CosExpression,
  FunctionDeclaration,
  Identifier,
  IfStatement,
  NumericLiteral,
  PrintStatement,
  Program,
  ReturnStatement,
  SDLInitStatement,
  SinExpression,
  StringLiteral,
  UnaryMinusExpression,
  VariableDeclaration,
  WhileStatement,
} from '../ast/ir-nodes.js';
import { LLVMTranslator } from './llvm-translator.js';

describe('LLVMTranslator', () => {
  it('translates function declaration', (t) => {
    const ir = new Program(
      [
        new FunctionDeclaration(
          'double',
          ['n'],
          [
            new VariableDeclaration(
              'result',
              new NumericLiteral(42, { start: { line: 2, column: 5 }, end: { line: 2, column: 7 } }),
              { start: { line: 2, column: 1 }, end: { line: 2, column: 7 } },
            ),
            new ReturnStatement('result', { start: { line: 3, column: 3 }, end: { line: 3, column: 10 } }),
          ],
          { start: { line: 1, column: 1 }, end: { line: 4, column: 1 } },
        ),
      ],
      null,
    );

    const translator = new LLVMTranslator();
    const result = translator.translate(ir);

    t.assert.snapshot(result);
  });

  it('translates call statement with result', (t) => {
    const ir = new Program(
      [
        new FunctionDeclaration(
          'double',
          ['n'],
          [
            new VariableDeclaration(
              'result',
              new NumericLiteral(42, { start: { line: 2, column: 5 }, end: { line: 2, column: 7 } }),
              { start: { line: 2, column: 1 }, end: { line: 2, column: 7 } },
            ),
            new ReturnStatement('result', { start: { line: 3, column: 3 }, end: { line: 3, column: 10 } }),
          ],
          { start: { line: 1, column: 1 }, end: { line: 4, column: 1 } },
        ),
        new VariableDeclaration(
          'x',
          new NumericLiteral(10, { start: { line: 5, column: 1 }, end: { line: 5, column: 1 } }),
          { start: { line: 5, column: 1 }, end: { line: 5, column: 1 } },
        ),
        new VariableDeclaration(
          'result',
          new NumericLiteral(0, { start: { line: 6, column: 1 }, end: { line: 6, column: 1 } }),
          { start: { line: 6, column: 1 }, end: { line: 6, column: 1 } },
        ),
        new CallStatement(
          'double',
          [new Identifier('x', { start: { line: 7, column: 13 }, end: { line: 7, column: 13 } })],
          'result',
          { start: { line: 7, column: 1 }, end: { line: 7, column: 15 } },
        ),
      ],
      null,
    );

    const translator = new LLVMTranslator();
    const result = translator.translate(ir);

    t.assert.snapshot(result);
  });

  it('translates sin expression', (t) => {
    const ir = new Program(
      [
        new VariableDeclaration(
          'x',
          new SinExpression(
            new NumericLiteral(90, { start: { line: 1, column: 5 }, end: { line: 1, column: 7 } }),
            new NumericLiteral(1000, { start: { line: 1, column: 9 }, end: { line: 1, column: 13 } }),
            { start: { line: 1, column: 1 }, end: { line: 1, column: 13 } },
          ),
          { start: { line: 1, column: 1 }, end: { line: 1, column: 13 } },
        ),
      ],
      null,
    );

    const translator = new LLVMTranslator();
    const result = translator.translate(ir);

    t.assert.snapshot(result);
  });

  it('translates cos expression', (t) => {
    const ir = new Program(
      [
        new VariableDeclaration(
          'x',
          new CosExpression(
            new NumericLiteral(90, { start: { line: 1, column: 5 }, end: { line: 1, column: 7 } }),
            new NumericLiteral(1000, { start: { line: 1, column: 9 }, end: { line: 1, column: 13 } }),
            { start: { line: 1, column: 1 }, end: { line: 1, column: 13 } },
          ),
          { start: { line: 1, column: 1 }, end: { line: 1, column: 13 } },
        ),
      ],
      null,
    );

    const translator = new LLVMTranslator();
    const result = translator.translate(ir);

    t.assert.snapshot(result);
  });

  it('translates print statement', (t) => {
    const ir = new Program(
      [
        new PrintStatement(new NumericLiteral(42, { start: { line: 1, column: 7 }, end: { line: 1, column: 9 } }), {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 9 },
        }),
      ],
      null,
    );

    const translator = new LLVMTranslator();
    const result = translator.translate(ir);

    t.assert.snapshot(result);
  });

  it('translates if statement', (t) => {
    const ir = new Program(
      [
        new VariableDeclaration(
          'x',
          new NumericLiteral(1, { start: { line: 1, column: 5 }, end: { line: 1, column: 6 } }),
          { start: { line: 1, column: 1 }, end: { line: 1, column: 6 } },
        ),
        new IfStatement(
          new Identifier('x', { start: { line: 2, column: 4 }, end: { line: 2, column: 5 } }),
          [
            new PrintStatement(new NumericLiteral(1, { start: { line: 3, column: 7 }, end: { line: 3, column: 8 } }), {
              start: { line: 3, column: 1 },
              end: { line: 3, column: 8 },
            }),
          ],
          { start: { line: 2, column: 1 }, end: { line: 4, column: 1 } },
        ),
      ],
      null,
    );

    const translator = new LLVMTranslator();
    const result = translator.translate(ir);

    t.assert.snapshot(result);
  });

  it('translates sdlInit statement', (t) => {
    const ir = new Program(
      [new SDLInitStatement({ start: { line: 1, column: 1 }, end: { line: 1, column: 8 } })],
      null,
    );

    const translator = new LLVMTranslator();
    const result = translator.translate(ir);

    t.assert.snapshot(result);
  });

  it('translates unary minus', (t) => {
    const ir = new Program(
      [
        new VariableDeclaration(
          'x',
          new UnaryMinusExpression(
            new NumericLiteral(5, { start: { line: 1, column: 6 }, end: { line: 1, column: 7 } }),
            { start: { line: 1, column: 5 }, end: { line: 1, column: 7 } },
          ),
          { start: { line: 1, column: 1 }, end: { line: 1, column: 7 } },
        ),
      ],
      null,
    );

    const translator = new LLVMTranslator();
    const result = translator.translate(ir);

    t.assert.snapshot(result);
  });

  it('translates while statement', (t) => {
    const ir = new Program(
      [
        new VariableDeclaration(
          'i',
          new NumericLiteral(0, { start: { line: 1, column: 5 }, end: { line: 1, column: 6 } }),
          { start: { line: 1, column: 1 }, end: { line: 1, column: 6 } },
        ),
        new WhileStatement(
          new BinaryExpression(
            new Identifier('i', { start: { line: 2, column: 6 }, end: { line: 2, column: 7 } }),
            '<',
            new NumericLiteral(3, { start: { line: 2, column: 9 }, end: { line: 2, column: 10 } }),
            { start: { line: 2, column: 6 }, end: { line: 2, column: 10 } },
          ),
          [
            new PrintStatement(new Identifier('i', { start: { line: 3, column: 7 }, end: { line: 3, column: 8 } }), {
              start: { line: 3, column: 1 },
              end: { line: 3, column: 8 },
            }),
            new AssignmentExpression(
              'i',
              new BinaryExpression(
                new Identifier('i', { start: { line: 4, column: 5 }, end: { line: 4, column: 6 } }),
                '+',
                new NumericLiteral(1, { start: { line: 4, column: 8 }, end: { line: 4, column: 9 } }),
                { start: { line: 4, column: 5 }, end: { line: 4, column: 9 } },
              ),
              { start: { line: 4, column: 1 }, end: { line: 4, column: 9 } },
            ),
          ],
          { start: { line: 2, column: 1 }, end: { line: 5, column: 1 } },
        ),
      ],
      null,
    );

    const translator = new LLVMTranslator();
    const result = translator.translate(ir);

    t.assert.snapshot(result);
  });

  it('translates assignment expression', (t) => {
    const ir = new Program(
      [
        new VariableDeclaration(
          'x',
          new NumericLiteral(10, { start: { line: 1, column: 5 }, end: { line: 1, column: 7 } }),
          { start: { line: 1, column: 1 }, end: { line: 1, column: 7 } },
        ),
        new AssignmentExpression(
          'x',
          new BinaryExpression(
            new Identifier('x', { start: { line: 2, column: 5 }, end: { line: 2, column: 6 } }),
            '+',
            new NumericLiteral(5, { start: { line: 2, column: 8 }, end: { line: 2, column: 9 } }),
            { start: { line: 2, column: 5 }, end: { line: 2, column: 9 } },
          ),
          { start: { line: 2, column: 1 }, end: { line: 2, column: 9 } },
        ),
        new PrintStatement(new Identifier('x', { start: { line: 3, column: 7 }, end: { line: 3, column: 8 } }), {
          start: { line: 3, column: 1 },
          end: { line: 3, column: 8 },
        }),
      ],
      null,
    );

    const translator = new LLVMTranslator();
    const result = translator.translate(ir);

    t.assert.snapshot(result);
  });

  it('translates string concatenation', (t) => {
    const ir = new Program(
      [
        new VariableDeclaration(
          's',
          new BinaryExpression(
            new StringLiteral('hello', { start: { line: 1, column: 5 }, end: { line: 1, column: 12 } }),
            '+',
            new StringLiteral(' world', { start: { line: 1, column: 14 }, end: { line: 1, column: 22 } }),
            { start: { line: 1, column: 5 }, end: { line: 1, column: 22 } },
          ),
          { start: { line: 1, column: 1 }, end: { line: 1, column: 22 } },
        ),
        new PrintStatement(new Identifier('s', { start: { line: 2, column: 7 }, end: { line: 2, column: 8 } }), {
          start: { line: 2, column: 1 },
          end: { line: 2, column: 8 },
        }),
      ],
      null,
    );

    const translator = new LLVMTranslator();
    const result = translator.translate(ir);

    t.assert.snapshot(result);
  });

  it('translates string concatenation with int', (t) => {
    const ir = new Program(
      [
        new VariableDeclaration(
          's',
          new BinaryExpression(
            new StringLiteral('count: ', { start: { line: 1, column: 5 }, end: { line: 1, column: 14 } }),
            '+',
            new NumericLiteral(42, { start: { line: 1, column: 16 }, end: { line: 1, column: 18 } }),
            { start: { line: 1, column: 5 }, end: { line: 1, column: 18 } },
          ),
          { start: { line: 1, column: 1 }, end: { line: 1, column: 18 } },
        ),
        new PrintStatement(new Identifier('s', { start: { line: 2, column: 7 }, end: { line: 2, column: 8 } }), {
          start: { line: 2, column: 1 },
          end: { line: 2, column: 8 },
        }),
      ],
      null,
    );

    const translator = new LLVMTranslator();
    const result = translator.translate(ir);

    t.assert.snapshot(result);
  });

  it('translates string comparison', (t) => {
    const ir = new Program(
      [
        new VariableDeclaration(
          'a',
          new StringLiteral('hello', { start: { line: 1, column: 5 }, end: { line: 1, column: 12 } }),
          { start: { line: 1, column: 1 }, end: { line: 1, column: 12 } },
        ),
        new VariableDeclaration(
          'b',
          new StringLiteral('world', { start: { line: 2, column: 5 }, end: { line: 2, column: 12 } }),
          { start: { line: 2, column: 1 }, end: { line: 2, column: 12 } },
        ),
        new VariableDeclaration(
          'eq',
          new BinaryExpression(
            new Identifier('a', { start: { line: 3, column: 6 }, end: { line: 3, column: 7 } }),
            '==',
            new Identifier('b', { start: { line: 3, column: 10 }, end: { line: 3, column: 11 } }),
            { start: { line: 3, column: 6 }, end: { line: 3, column: 11 } },
          ),
          { start: { line: 3, column: 1 }, end: { line: 3, column: 11 } },
        ),
        new PrintStatement(new Identifier('eq', { start: { line: 4, column: 7 }, end: { line: 4, column: 8 } }), {
          start: { line: 4, column: 1 },
          end: { line: 4, column: 8 },
        }),
      ],
      null,
    );

    const translator = new LLVMTranslator();
    const result = translator.translate(ir);

    t.assert.snapshot(result);
  });

  it('translates array declaration', (t) => {
    const ir = new Program(
      [
        new ArrayDeclaration(
          'arr',
          new NumericLiteral(10, { start: { line: 1, column: 10 }, end: { line: 1, column: 12 } }),
          { start: { line: 1, column: 1 }, end: { line: 1, column: 13 } },
        ),
      ],
      null,
    );

    const translator = new LLVMTranslator();
    const result = translator.translate(ir);

    t.assert.snapshot(result);
  });

  it('translates array access', (t) => {
    const ir = new Program(
      [
        new ArrayDeclaration(
          'arr',
          new NumericLiteral(10, { start: { line: 1, column: 10 }, end: { line: 1, column: 12 } }),
          { start: { line: 1, column: 1 }, end: { line: 1, column: 13 } },
        ),
        new VariableDeclaration(
          'x',
          new ArrayAccess(
            'arr',
            new NumericLiteral(5, { start: { line: 2, column: 8 }, end: { line: 2, column: 9 } }),
            { start: { line: 2, column: 5 }, end: { line: 2, column: 10 } },
          ),
          { start: { line: 2, column: 1 }, end: { line: 2, column: 10 } },
        ),
      ],
      null,
    );

    const translator = new LLVMTranslator();
    const result = translator.translate(ir);

    t.assert.snapshot(result);
  });

  it('translates array assignment', (t) => {
    const ir = new Program(
      [
        new ArrayDeclaration(
          'arr',
          new NumericLiteral(10, { start: { line: 1, column: 10 }, end: { line: 1, column: 12 } }),
          { start: { line: 1, column: 1 }, end: { line: 1, column: 13 } },
        ),
        new ArrayAssignment(
          'arr',
          new NumericLiteral(5, { start: { line: 2, column: 5 }, end: { line: 2, column: 6 } }),
          new NumericLiteral(42, { start: { line: 2, column: 10 }, end: { line: 2, column: 12 } }),
          { start: { line: 2, column: 1 }, end: { line: 2, column: 12 } },
        ),
      ],
      null,
    );

    const translator = new LLVMTranslator();
    const result = translator.translate(ir);

    t.assert.snapshot(result);
  });

  it('translates array assignment with expression index', (t) => {
    const ir = new Program(
      [
        new ArrayDeclaration(
          'arr',
          new NumericLiteral(10, { start: { line: 1, column: 10 }, end: { line: 1, column: 12 } }),
          { start: { line: 1, column: 1 }, end: { line: 1, column: 13 } },
        ),
        new VariableDeclaration(
          'i',
          new NumericLiteral(3, { start: { line: 2, column: 5 }, end: { line: 2, column: 6 } }),
          { start: { line: 2, column: 1 }, end: { line: 2, column: 6 } },
        ),
        new ArrayAssignment(
          'arr',
          new BinaryExpression(
            new Identifier('i', { start: { line: 3, column: 5 }, end: { line: 3, column: 6 } }),
            '+',
            new NumericLiteral(2, { start: { line: 3, column: 8 }, end: { line: 3, column: 9 } }),
            { start: { line: 3, column: 5 }, end: { line: 3, column: 9 } },
          ),
          new NumericLiteral(99, { start: { line: 3, column: 13 }, end: { line: 3, column: 15 } }),
          { start: { line: 3, column: 1 }, end: { line: 3, column: 15 } },
        ),
      ],
      null,
    );

    const translator = new LLVMTranslator();
    const result = translator.translate(ir);

    t.assert.snapshot(result);
  });
});
