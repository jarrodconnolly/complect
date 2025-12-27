/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/

// Base class for all AST nodes, includes location info for error reporting
export class Node {
  constructor(loc) {
    this.loc = loc; // { start: { line, column }, end: { line, column } }
  }
}

// Base class for statements
export class Statement extends Node {
  constructor(loc) {
    super(loc);
  }
}

// Base class for expressions
export class Expression extends Node {
  constructor(loc) {
    super(loc);
  }
}

// Top-level program node
export class Program extends Node {
  constructor(statements, loc) {
    super(loc);
    this.statements = statements; // Array of Statement
  }
}

// Variable declaration (e.g., make x 5)
export class VariableDeclaration extends Statement {
  constructor(identifier, value, loc) {
    super(loc);
    this.identifier = identifier; // string (variable name)
    this.value = value; // Expression (initial value)
  }
}

// Assignment expression (e.g., x = 5 or assign x 5)
export class AssignmentExpression extends Statement {
  constructor(left, right, loc) {
    super(loc);
    this.left = left; // string (variable name)
    this.right = right; // Expression
  }
}

// Binary expression (e.g., a + b)
export class BinaryExpression extends Expression {
  constructor(left, operator, right, loc) {
    super(loc);
    this.left = left; // Expression
    this.operator = operator; // string (e.g., '+', '==')
    this.right = right; // Expression
  }
}

// If statement (e.g., if condition ... endif)
export class IfStatement extends Statement {
  constructor(test, consequent, loc) {
    super(loc);
    this.test = test; // Expression (condition)
    this.consequent = consequent; // Array of Statement (body)
  }
}

// While statement (e.g., as condition ... repeat)
export class WhileStatement extends Statement {
  constructor(test, body, loc) {
    super(loc);
    this.test = test; // Expression (condition)
    this.body = body; // Array of Statement
  }
}

// Print statement (e.g., print x)
export class PrintStatement extends Statement {
  constructor(argument, loc) {
    super(loc);
    this.argument = argument; // Expression (what to print)
  }
}

// Free statement (e.g., free x)
export class FreeStatement extends Statement {
  constructor(identifier, loc) {
    super(loc);
    this.identifier = identifier; // string (variable name)
  }
}

// Identifier (e.g., variable name)
export class Identifier extends Expression {
  constructor(name, loc) {
    super(loc);
    this.name = name; // string
  }
}

// Numeric literal (e.g., 42)
export class NumericLiteral extends Expression {
  constructor(value, loc) {
    super(loc);
    this.value = value; // number
  }
}

// String literal (e.g., 'hello')
export class StringLiteral extends Expression {
  constructor(value, loc) {
    super(loc);
    this.value = value; // string (without quotes)
  }
}