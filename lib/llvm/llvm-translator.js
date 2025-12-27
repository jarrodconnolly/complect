/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/

import llvm from 'llvm-bindings';
import { VariableDeclaration, AssignmentExpression, BinaryExpression, IfStatement, WhileStatement, PrintStatement, FreeStatement, FunctionDeclaration, ReturnStatement, CallStatement, Identifier, NumericLiteral, StringLiteral } from '../ast/ir-nodes.js';

export class LLVMTranslator {
  constructor() {
    this.context = new llvm.LLVMContext();
    this.module = null;
    this.builder = null;
    this.variables = new Map(); // name -> { type: 'int'|'string', value: LLVM Value }
    this.function = null;
    this.stringLiterals = new Map(); // value -> global string constant
    this.functionSignatures = new Map(); // name -> array of types
  }

  translate(ir) {
    this.module = new llvm.Module('complect', this.context);
    this.module.setTargetTriple('x86_64-pc-linux-gnu');
    this.builder = new llvm.IRBuilder(this.context);

    // Declare runtime functions
    this.declareRuntimeFunctions();

    // Collect function signatures by traversing all statements (infer parameter types from usage)
    this.collectFunctionSignatures(ir.statements);

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

  collectFunctionSignatures(statements) {
    for (const stmt of statements) {
      if (stmt instanceof CallStatement) {
        const signature = this.functionSignatures.get(stmt.callee) || [];
        const argTypes = stmt.arguments.map(arg => this.getExpressionType(arg));
        
        // Update signature with inferred types
        for (let i = 0; i < argTypes.length; i++) {
          if (i >= signature.length) {
            signature.push(argTypes[i]);
          } else if (signature[i] !== argTypes[i]) {
            // Type conflict - for now, prefer string over int
            if (signature[i] === 'int' && argTypes[i] === 'string') {
              signature[i] = 'string';
            }
          }
        }
        
        this.functionSignatures.set(stmt.callee, signature);
      } else if (stmt instanceof FunctionDeclaration) {
        // Collect function call signatures from nested function and control-flow bodies
        this.collectFunctionSignatures(stmt.body);
      } else if (stmt instanceof IfStatement) {
        this.collectFunctionSignatures(stmt.consequent);
      } else if (stmt instanceof WhileStatement) {
        this.collectFunctionSignatures(stmt.body);
      }
    }
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

    const freeType = llvm.FunctionType.get(this.builder.getVoidTy(), [this.builder.getInt8PtrTy()], false);
    this.module.getOrInsertFunction('free', freeType);

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
        
        // For string variables, allocate a copy of the initial value
        if (stmt.value instanceof StringLiteral) {
          const strLen = this.builder.CreateCall(this.module.getFunction('strlen'), [value], 'strlen');
          const allocSize = this.builder.CreateAdd(strLen, this.builder.getInt64(1), 'allocSize');
          const buffer = this.builder.CreateCall(this.module.getFunction('malloc'), [allocSize], 'buffer');
          this.builder.CreateCall(this.module.getFunction('strcpy'), [buffer, value], 'strcpy');
          this.builder.CreateStore(buffer, alloca);
        } else {
          this.builder.CreateStore(value, alloca);
        }
        
        varInfo.value = alloca;
      }

      this.variables.set(stmt.identifier, varInfo);

    } else if (stmt instanceof AssignmentExpression) {
      const rightExpr = stmt.right;
      const value = this.translateExpression(rightExpr);
      const varInfo = this.variables.get(stmt.left);
      if (!varInfo) {
        throw new Error(`Undefined variable: ${stmt.left}`);
      }
      
      // For string assignments, ensure we store a malloc'd copy
      let finalValue = value;
      if (varInfo.type === 'string' && rightExpr instanceof StringLiteral) {
        const strLen = this.builder.CreateCall(this.module.getFunction('strlen'), [value], 'strlen');
        const allocSize = this.builder.CreateAdd(strLen, this.builder.getInt64(1), 'allocSize');
        const buffer = this.builder.CreateCall(this.module.getFunction('malloc'), [allocSize], 'buffer');
        this.builder.CreateCall(this.module.getFunction('strcpy'), [buffer, value], 'strcpy');
        finalValue = buffer;
      }
      
      // Automatically free old string value before assignment
      if (varInfo.type === 'string') {
        const oldValue = this.builder.CreateLoad(this.builder.getInt8PtrTy(), varInfo.value);
        this.builder.CreateCall(this.module.getFunction('free'), [oldValue]);
      }
      
      this.builder.CreateStore(finalValue, varInfo.value);

    } else if (stmt instanceof PrintStatement) {
      this.translatePrint(stmt);

    } else if (stmt instanceof FreeStatement) {
      const varInfo = this.variables.get(stmt.identifier);
      if (!varInfo) {
        throw new Error(`Undefined variable: ${stmt.identifier}`);
      }
      if (varInfo.type === 'string') {
        const oldValue = this.builder.CreateLoad(this.builder.getInt8PtrTy(), varInfo.value);
        this.builder.CreateCall(this.module.getFunction('free'), [oldValue]);
      }

    } else if (stmt instanceof IfStatement) {
      this.translateIf(stmt);

    } else if (stmt instanceof WhileStatement) {
      this.translateWhile(stmt);

    } else if (stmt instanceof FunctionDeclaration) {
      this.translateFunctionDeclaration(stmt);

    } else if (stmt instanceof ReturnStatement) {
      const varInfo = this.variables.get(stmt.argument);
      if (!varInfo) {
        throw new Error(`Undefined variable: ${stmt.argument}`);
      }
      const value = this.builder.CreateLoad(varInfo.type === 'int' ? this.builder.getInt32Ty() : this.builder.getInt8PtrTy(), varInfo.value);
      this.builder.CreateRet(value);

    } else if (stmt instanceof CallStatement) {
      const callee = this.module.getFunction(stmt.callee);
      if (!callee) {
        throw new Error(`Undefined function: ${stmt.callee}`);
      }
      
      const args = stmt.arguments.map(arg => this.translateExpression(arg));
      const call = this.builder.CreateCall(callee, args, stmt.result ? 'call' : '');
      
      if (stmt.result) {
        // Store result in the pre-declared variable
        const resultVar = this.variables.get(stmt.result);
        if (!resultVar) {
          throw new Error(`Undefined result variable: ${stmt.result}`);
        }
        this.builder.CreateStore(call, resultVar.value);
      }

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

    // Free temporaries created by intToString
    if (leftType === 'int') {
      this.builder.CreateCall(this.module.getFunction('free'), [leftStr]);
    }
    if (rightType === 'int') {
      this.builder.CreateCall(this.module.getFunction('free'), [rightStr]);
    }

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
    const buffer = this.builder.CreateCall(this.module.getFunction('malloc'), [this.builder.getInt64(32)], 'buffer');
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

  translateFunctionDeclaration(stmt) {
    // For now, assume all functions return int (we can extend this later)
    const returnType = this.builder.getInt32Ty();
    
    // Get parameter types from collected signatures, default to int
    const signature = this.functionSignatures.get(stmt.name) || [];
    const paramTypes = stmt.params.map((param, i) => {
      const inferredType = signature[i] || 'int';
      return inferredType === 'string' ? this.builder.getInt8PtrTy() : this.builder.getInt32Ty();
    });
    
    // Create function type
    const funcType = llvm.FunctionType.get(returnType, paramTypes, false);
    
    // Create function
    const func = llvm.Function.Create(funcType, llvm.Function.LinkageTypes.InternalLinkage, stmt.name, this.module);
    
    // Create entry block
    const entryBB = llvm.BasicBlock.Create(this.context, 'entry', func);
    
    // Save current builder position and variables
    const savedInsertPoint = this.builder.GetInsertBlock();
    const savedVariables = new Map(this.variables);
    
    // Set up function scope
    this.builder.SetInsertPoint(entryBB);
    this.variables.clear(); // Start with fresh scope
    
    // Set up parameters
    for (let i = 0; i < stmt.params.length; i++) {
      const param = func.getArg(i);
      param.name = stmt.params[i];
      
      const paramType = signature[i] || 'int';
      
      // Create alloca for parameter
      const llvmType = paramType === 'string' ? this.builder.getInt8PtrTy() : this.builder.getInt32Ty();
      const alloca = this.builder.CreateAlloca(llvmType, null, stmt.params[i]);
      this.builder.CreateStore(param, alloca);
      
      // Add to variables map
      this.variables.set(stmt.params[i], { type: paramType, value: alloca });
    }
    
    // Translate function body
    for (const bodyStmt of stmt.body) {
      this.translateStatement(bodyStmt);
    }
    
    // If no return statement in the current insertion block, add a default return
    const currentBB = this.builder.GetInsertBlock();
    if (currentBB && !currentBB.getTerminator()) {
      this.builder.CreateRet(this.builder.getInt32(0));
    }
    
    // Verify function
    if (llvm.verifyFunction(func)) {
      throw new Error(`Function verification failed for ${stmt.name}`);
    }
    
    // Restore previous state
    this.builder.SetInsertPoint(savedInsertPoint);
    this.variables = savedVariables;
  }
}