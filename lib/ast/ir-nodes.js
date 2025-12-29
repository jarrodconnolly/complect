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

// Sin expression (e.g., sin angle scale)
export class SinExpression extends Expression {
  constructor(argument, scale, loc) {
    super(loc);
    this.argument = argument; // Expression
    this.scale = scale; // Expression
  }
}

// Cos expression (e.g., cos angle scale)
export class CosExpression extends Expression {
  constructor(argument, scale, loc) {
    super(loc);
    this.argument = argument; // Expression
    this.scale = scale; // Expression
  }
}

// Unary minus expression (e.g., -expr)
export class UnaryMinusExpression extends Expression {
  constructor(expression, loc) {
    super(loc);
    this.expression = expression; // Expression
  }
}

// Function declaration (e.g., function name param1 param2 ... end)
export class FunctionDeclaration extends Statement {
  constructor(name, params, body, loc) {
    super(loc);
    this.name = name; // string (function name)
    this.params = params; // array of strings (parameter names)
    this.body = body; // array of Statement
  }
}

// Return statement (e.g., return variable)
export class ReturnStatement extends Statement {
  constructor(argument, loc) {
    super(loc);
    this.argument = argument; // string (variable name to return)
  }
}

// Call statement (e.g., call func arg1 arg2 result)
export class CallStatement extends Statement {
  constructor(callee, args, result, loc) {
    super(loc);
    this.callee = callee; // string (function name)
    this.arguments = args; // array of Expression
    this.result = result; // string or null (result variable, null for void calls)
  }
}

// SDL init statement
export class SDLInitStatement extends Statement {
  constructor(loc) {
    super(loc);
  }
}

// SDL window statement (e.g., sdlWindow width height title)
export class SDLWindowStatement extends Statement {
  constructor(width, height, title, loc) {
    super(loc);
    this.width = width; // Expression
    this.height = height; // Expression
    this.title = title; // string
  }
}

// SDL delay statement (e.g., sdlDelay 5000)
export class SDLDelayStatement extends Statement {
  constructor(delay, loc) {
    super(loc);
    this.delay = delay; // Expression
  }
}

// SDL handle events statement
export class SDLHandleEventsStatement extends Statement {
  constructor(loc) {
    super(loc);
  }
}

// SDL create renderer statement
export class SDLCreateRendererStatement extends Statement {
  constructor(loc) {
    super(loc);
  }
}

// SDL put pixel statement (e.g., sdlPutPixel x y r g b)
export class SDLPutPixelStatement extends Statement {
  constructor(x, y, r, g, b, loc) {
    super(loc);
    this.x = x;
    this.y = y;
    this.r = r;
    this.g = g;
    this.b = b;
  }
}

// SDL present statement
export class SDLPresentStatement extends Statement {
  constructor(loc) {
    super(loc);
  }
}

// SDL clear statement
export class SDLClearStatement extends Statement {
  constructor(loc) {
    super(loc);
  }
}

// SDL set color statement (e.g., sdlSetColor r g b)
export class SDLSetColorStatement extends Statement {
  constructor(r, g, b, loc) {
    super(loc);
    this.r = r;
    this.g = g;
    this.b = b;
  }
}

// SDL draw line statement (e.g., sdlDrawLine x1 y1 x2 y2)
export class SDLDrawLineStatement extends Statement {
  constructor(x1, y1, x2, y2, loc) {
    super(loc);
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }
}