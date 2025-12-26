/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/

import llvm from 'llvm-bindings';
import { VariableDeclaration, AssignmentExpression, BinaryExpression, IfStatement, WhileStatement, PrintStatement, Identifier, NumericLiteral, StringLiteral } from '../ast/ir-nodes.js';

export class LLVMTranslator {
  constructor() {
    this.context = new llvm.LLVMContext();
    this.module = null;
    this.builder = null;
    this.variables = new Map(); // name -> { type: 'int'|'string', value: LLVM Value }
    this.function = null;
    this.stringLiterals = new Map(); // value -> global string constant
  }

  translate(ir) {
    this.module = new llvm.Module('complect', this.context);
    this.module.setTargetTriple('x86_64-pc-linux-gnu');
    this.builder = new llvm.IRBuilder(this.context);

    // Declare runtime functions
    this.declareRuntimeFunctions();

    // Create main function
    const mainType = llvm.FunctionType.get(this.builder.getInt32Ty(), [], false);
    this.function = llvm.Function.Create(mainType, llvm.Function.LinkageTypes.ExternalLinkage, 'main', this.module);

    const entryBB = llvm.BasicBlock.Create(this.context, 'entry', this.function);
    this.builder.SetInsertPoint(entryBB);

    // Translate statements
    for (const stmt of ir.statements) {
      this.translateStatement(stmt);
    }

    // Return 0
    this.builder.CreateRet(this.builder.getInt32(0));

    // Verify
    if (llvm.verifyFunction(this.function)) {
      throw new Error('Function verification failed');
    }
    if (llvm.verifyModule(this.module)) {
      throw new Error('Module verification failed');
    }

    return this.module.print();
  }

  declareRuntimeFunctions() {
    // Declare printf
    const printfType = llvm.FunctionType.get(
      this.builder.getInt32Ty(),
      [this.builder.getInt8PtrTy()],
      true
    );
    this.module.getOrInsertFunction('printf', printfType);

    // Declare string functions
    const mallocType = llvm.FunctionType.get(this.builder.getInt8PtrTy(), [this.builder.getInt64Ty()], false);
    this.module.getOrInsertFunction('malloc', mallocType);

    const strcpyType = llvm.FunctionType.get(this.builder.getInt8PtrTy(), [this.builder.getInt8PtrTy(), this.builder.getInt8PtrTy()], false);
    this.module.getOrInsertFunction('strcpy', strcpyType);

    const strcatType = llvm.FunctionType.get(this.builder.getInt8PtrTy(), [this.builder.getInt8PtrTy(), this.builder.getInt8PtrTy()], false);
    this.module.getOrInsertFunction('strcat', strcatType);

    const strcmpType = llvm.FunctionType.get(this.builder.getInt32Ty(), [this.builder.getInt8PtrTy(), this.builder.getInt8PtrTy()], false);
    this.module.getOrInsertFunction('strcmp', strcmpType);

    const sprintfType = llvm.FunctionType.get(this.builder.getInt32Ty(), [this.builder.getInt8PtrTy(), this.builder.getInt8PtrTy()], true);
    this.module.getOrInsertFunction('sprintf', sprintfType);

    const strlenType = llvm.FunctionType.get(this.builder.getInt64Ty(), [this.builder.getInt8PtrTy()], false);
    this.module.getOrInsertFunction('strlen', strlenType);
  }

  translateStatement(stmt) {
    if (stmt instanceof VariableDeclaration) {
      const value = this.translateExpression(stmt.value);
      const varInfo = { type: this.getExpressionType(stmt.value), value: null };

      if (varInfo.type === 'int') {
        // Create alloca for int variable
        const alloca = this.builder.CreateAlloca(this.builder.getInt32Ty(), null, stmt.identifier);
        this.builder.CreateStore(value, alloca);
        varInfo.value = alloca;
      } else if (varInfo.type === 'string') {
        // Create alloca for string variable (i8**)
        const alloca = this.builder.CreateAlloca(this.builder.getInt8PtrTy(), null, stmt.identifier);
        this.builder.CreateStore(value, alloca);
        varInfo.value = alloca;
      }

      this.variables.set(stmt.identifier, varInfo);

    } else if (stmt instanceof AssignmentExpression) {
      const value = this.translateExpression(stmt.right);
      const varInfo = this.variables.get(stmt.left);
      if (!varInfo) {
        throw new Error(`Undefined variable: ${stmt.left}`);
      }
      this.builder.CreateStore(value, varInfo.value);

    } else if (stmt instanceof PrintStatement) {
      this.translatePrint(stmt);

    } else if (stmt instanceof IfStatement) {
      this.translateIf(stmt);

    } else if (stmt instanceof WhileStatement) {
      this.translateWhile(stmt);

    } else {
      throw new Error(`Unknown statement type: ${stmt.constructor.name}`);
    }
  }

  translateExpression(expr) {
    if (expr instanceof Identifier) {
      const varInfo = this.variables.get(expr.name);
      if (!varInfo) {
        throw new Error(`Undefined variable: ${expr.name}`);
      }
      return this.builder.CreateLoad(varInfo.type === 'int' ? this.builder.getInt32Ty() : this.builder.getInt8PtrTy(), varInfo.value, expr.name);

    } else if (expr instanceof NumericLiteral) {
      return this.builder.getInt32(expr.value);

    } else if (expr instanceof StringLiteral) {
      return this.getStringConstant(expr.value);

    } else if (expr instanceof BinaryExpression) {
      return this.translateBinaryExpression(expr);

    } else {
      throw new Error(`Unknown expression type: ${expr.constructor.name}`);
    }
  }

  translateBinaryExpression(expr) {
    const left = this.translateExpression(expr.left);
    const right = this.translateExpression(expr.right);
    const leftType = this.getExpressionType(expr.left);
    const rightType = this.getExpressionType(expr.right);

    switch (expr.operator) {
      case '+':
        if (leftType === 'string' || rightType === 'string') {
          return this.stringConcat(left, right, leftType, rightType);
        } else {
          return this.builder.CreateAdd(left, right, 'add');
        }
      case '-': return this.builder.CreateSub(left, right, 'sub');
      case '*': return this.builder.CreateMul(left, right, 'mul');
      case '/': return this.builder.CreateSDiv(left, right, 'div');
      case '%': return this.builder.CreateSRem(left, right, 'rem');
      case '==':
        if (leftType === 'string' && rightType === 'string') {
          return this.stringCompare(left, right, 'eq');
        } else {
          return this.builder.CreateICmpEQ(left, right, 'eq');
        }
      case '!=':
        if (leftType === 'string' && rightType === 'string') {
          return this.stringCompare(left, right, 'ne');
        } else {
          return this.builder.CreateICmpNE(left, right, 'ne');
        }
      case '<':
        if (leftType === 'string' && rightType === 'string') {
          return this.stringCompare(left, right, 'lt');
        } else {
          return this.builder.CreateICmpSLT(left, right, 'lt');
        }
      case '<=':
        if (leftType === 'string' && rightType === 'string') {
          return this.stringCompare(left, right, 'le');
        } else {
          return this.builder.CreateICmpSLE(left, right, 'le');
        }
      case '>':
        if (leftType === 'string' && rightType === 'string') {
          return this.stringCompare(left, right, 'gt');
        } else {
          return this.builder.CreateICmpSGT(left, right, 'gt');
        }
      case '>=':
        if (leftType === 'string' && rightType === 'string') {
          return this.stringCompare(left, right, 'ge');
        } else {
          return this.builder.CreateICmpSGE(left, right, 'ge');
        }
      default: throw new Error(`Unknown operator: ${expr.operator}`);
    }
  }

  stringConcat(left, right, leftType, rightType) {
    // Convert integers to strings if needed
    let leftStr = left;
    let rightStr = right;

    if (leftType === 'int') {
      leftStr = this.intToString(left);
    }
    if (rightType === 'int') {
      rightStr = this.intToString(right);
    }

    // Allocate space for concatenated string
    const leftLen = this.builder.CreateCall(this.module.getFunction('strlen'), [leftStr], 'leftlen');
    const rightLen = this.builder.CreateCall(this.module.getFunction('strlen'), [rightStr], 'rightlen');
    const totalLen = this.builder.CreateAdd(this.builder.CreateAdd(leftLen, rightLen, 'total'), this.builder.getInt64(1), 'totalplus1');
    const buffer = this.builder.CreateCall(this.module.getFunction('malloc'), [totalLen], 'buffer');

    // Copy first string
    this.builder.CreateCall(this.module.getFunction('strcpy'), [buffer, leftStr], 'copy1');
    // Concatenate second string
    this.builder.CreateCall(this.module.getFunction('strcat'), [buffer, rightStr], 'concat');

    return buffer;
  }

  stringCompare(left, right, op) {
    const strcmpFunc = this.module.getFunction('strcmp');
    const result = this.builder.CreateCall(strcmpFunc, [left, right], 'strcmp');

    switch (op) {
      case 'eq': return this.builder.CreateICmpEQ(result, this.builder.getInt32(0), 'streq');
      case 'ne': return this.builder.CreateICmpNE(result, this.builder.getInt32(0), 'strne');
      case 'lt': return this.builder.CreateICmpSLT(result, this.builder.getInt32(0), 'strlt');
      case 'le': return this.builder.CreateICmpSLE(result, this.builder.getInt32(0), 'strle');
      case 'gt': return this.builder.CreateICmpSGT(result, this.builder.getInt32(0), 'strgt');
      case 'ge': return this.builder.CreateICmpSGE(result, this.builder.getInt32(0), 'strge');
    }
  }

  intToString(value) {
    // Allocate buffer for number string (up to 32 digits should be enough)
    const buffer = this.builder.CreateCall(this.module.getFunction('malloc'), [this.builder.getInt64(32)], 'intbuf');
    const formatStr = this.getStringConstant('%d');
    this.builder.CreateCall(this.module.getFunction('sprintf'), [buffer, formatStr, value], 'sprintf');
    return buffer;
  }

  getExpressionType(expr) {
    if (expr instanceof Identifier) {
      const varInfo = this.variables.get(expr.name);
      return varInfo ? varInfo.type : 'int'; // fallback
    } else if (expr instanceof NumericLiteral) {
      return 'int';
    } else if (expr instanceof StringLiteral) {
      return 'string';
    } else if (expr instanceof BinaryExpression) {
      // For binary expressions, we need to determine the result type
      const leftType = this.getExpressionType(expr.left);
      const rightType = this.getExpressionType(expr.right);
      
      if (expr.operator === '+') {
        // String concatenation if either operand is string
        if (leftType === 'string' || rightType === 'string') {
          return 'string';
        }
      }
      
      // For comparisons, result is always int (boolean)
      if (['==', '!=', '<', '<=', '>', '>='].includes(expr.operator)) {
        return 'int';
      }
      
      // Default to int for arithmetic
      return 'int';
    }
    return 'int';
  }

  getStringConstant(value) {
    if (this.stringLiterals.has(value)) {
      return this.stringLiterals.get(value);
    }

    const strConst = this.builder.CreateGlobalStringPtr(value, `.str.${this.stringLiterals.size}`, 0, this.module);
    this.stringLiterals.set(value, strConst);
    return strConst;
  }

  translatePrint(stmt) {
    const printfFunc = this.module.getFunction('printf');
    const argType = this.getExpressionType(stmt.argument);
    
    let formatStr;
    if (argType === 'string') {
      formatStr = this.getStringConstant('%s\n');
    } else {
      formatStr = this.getStringConstant('%d\n');
    }
    
    const value = this.translateExpression(stmt.argument);
    this.builder.CreateCall(printfFunc, [formatStr, value], 'print');
  }

  translateIf(stmt) {
    const cond = this.translateExpression(stmt.test);
    
    const thenBB = llvm.BasicBlock.Create(this.context, 'then', this.function);
    const elseBB = llvm.BasicBlock.Create(this.context, 'else', this.function);
    const mergeBB = llvm.BasicBlock.Create(this.context, 'merge', this.function);
    
    this.builder.CreateCondBr(cond, thenBB, elseBB);
    
    // Then block
    this.builder.SetInsertPoint(thenBB);
    for (const s of stmt.consequent) {
      this.translateStatement(s);
    }
    this.builder.CreateBr(mergeBB);
    
    // Else block (empty for now)
    this.builder.SetInsertPoint(elseBB);
    this.builder.CreateBr(mergeBB);
    
    // Merge
    this.builder.SetInsertPoint(mergeBB);
  }

  translateWhile(stmt) {
    const condBB = llvm.BasicBlock.Create(this.context, 'cond', this.function);
    const bodyBB = llvm.BasicBlock.Create(this.context, 'body', this.function);
    const exitBB = llvm.BasicBlock.Create(this.context, 'exit', this.function);
    
    this.builder.CreateBr(condBB);
    
    // Condition
    this.builder.SetInsertPoint(condBB);
    const cond = this.translateExpression(stmt.test);
    this.builder.CreateCondBr(cond, bodyBB, exitBB);
    
    // Body
    this.builder.SetInsertPoint(bodyBB);
    for (const s of stmt.body) {
      this.translateStatement(s);
    }
    this.builder.CreateBr(condBB);
    
    // Exit
    this.builder.SetInsertPoint(exitBB);
  }
}