/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
 */

import llvm from 'llvm-bindings';
import {
  AssignmentExpression,
  BinaryExpression,
  CallStatement,
  CosExpression,
  FreeStatement,
  FunctionDeclaration,
  Identifier,
  IfStatement,
  NumericLiteral,
  PrintStatement,
  ReturnStatement,
  SDLClearStatement,
  SDLCreateRendererStatement,
  SDLDelayStatement,
  SDLDrawLineStatement,
  SDLHandleEventsStatement,
  SDLInitStatement,
  SDLPresentStatement,
  SDLPutPixelStatement,
  SDLSetColorStatement,
  SDLWindowStatement,
  SinExpression,
  StringLiteral,
  UnaryMinusExpression,
  VariableDeclaration,
  WhileStatement,
} from '../ast/ir-nodes.js';

export class LLVMTranslator {
  constructor() {
    this.context = new llvm.LLVMContext();
    this.module = null;
    this.builder = null;
    this.variables = new Map(); // name -> { type: 'int'|'string', value: LLVM Value }
    this.function = null;
    this.stringLiterals = new Map(); // value -> global string constant
    this.functionSignatures = new Map(); // name -> array of types
    this.eventType = null;
    this.renderer = null; // Global renderer
  }

  translate(ir) {
    this.module = new llvm.Module('complect', this.context);
    this.module.setTargetTriple('x86_64-pc-linux-gnu');
    this.builder = new llvm.IRBuilder(this.context);

    // Define SDL_Event struct (simplified, 14 int32 fields for 56 bytes)
    this.eventType = llvm.StructType.create(this.context, 'SDL_Event');
    this.eventType.setBody(Array(14).fill(this.builder.getInt32Ty()));

    // Declare runtime functions
    this.declareRuntimeFunctions();

    // Create global variables for SDL
    this.window = new llvm.GlobalVariable(
      this.module,
      this.builder.getInt8PtrTy(),
      false,
      llvm.GlobalValue.LinkageTypes.CommonLinkage,
      llvm.ConstantPointerNull.get(this.builder.getInt8PtrTy()),
      'window',
    );
    this.renderer = new llvm.GlobalVariable(
      this.module,
      this.builder.getInt8PtrTy(),
      false,
      llvm.GlobalValue.LinkageTypes.CommonLinkage,
      llvm.ConstantPointerNull.get(this.builder.getInt8PtrTy()),
      'renderer',
    );

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
        const argTypes = stmt.arguments.map((arg) => this.getExpressionType(arg));

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
    const printfType = llvm.FunctionType.get(this.builder.getInt32Ty(), [this.builder.getInt8PtrTy()], true);
    this.module.getOrInsertFunction('printf', printfType);

    // Declare string functions
    const mallocType = llvm.FunctionType.get(this.builder.getInt8PtrTy(), [this.builder.getInt64Ty()], false);
    this.module.getOrInsertFunction('malloc', mallocType);

    const freeType = llvm.FunctionType.get(this.builder.getVoidTy(), [this.builder.getInt8PtrTy()], false);
    this.module.getOrInsertFunction('free', freeType);

    const strcpyType = llvm.FunctionType.get(
      this.builder.getInt8PtrTy(),
      [this.builder.getInt8PtrTy(), this.builder.getInt8PtrTy()],
      false,
    );
    this.module.getOrInsertFunction('strcpy', strcpyType);

    const strcatType = llvm.FunctionType.get(
      this.builder.getInt8PtrTy(),
      [this.builder.getInt8PtrTy(), this.builder.getInt8PtrTy()],
      false,
    );
    this.module.getOrInsertFunction('strcat', strcatType);

    const strcmpType = llvm.FunctionType.get(
      this.builder.getInt32Ty(),
      [this.builder.getInt8PtrTy(), this.builder.getInt8PtrTy()],
      false,
    );
    this.module.getOrInsertFunction('strcmp', strcmpType);

    const sprintfType = llvm.FunctionType.get(
      this.builder.getInt32Ty(),
      [this.builder.getInt8PtrTy(), this.builder.getInt8PtrTy()],
      true,
    );
    this.module.getOrInsertFunction('sprintf', sprintfType);

    const strlenType = llvm.FunctionType.get(this.builder.getInt64Ty(), [this.builder.getInt8PtrTy()], false);
    this.module.getOrInsertFunction('strlen', strlenType);

    // Declare SDL functions
    const sdlInitType = llvm.FunctionType.get(this.builder.getInt32Ty(), [this.builder.getInt32Ty()], false);
    this.module.getOrInsertFunction('SDL_Init', sdlInitType);

    const sdlCreateWindowType = llvm.FunctionType.get(
      this.builder.getInt8PtrTy(),
      [
        this.builder.getInt8PtrTy(),
        this.builder.getInt32Ty(),
        this.builder.getInt32Ty(),
        this.builder.getInt32Ty(),
        this.builder.getInt32Ty(),
        this.builder.getInt32Ty(),
      ],
      false,
    );
    this.module.getOrInsertFunction('SDL_CreateWindow', sdlCreateWindowType);

    const sdlQuitType = llvm.FunctionType.get(this.builder.getVoidTy(), [], false);
    this.module.getOrInsertFunction('SDL_Quit', sdlQuitType);

    // Declare SDL_Delay for keeping window open
    const sdlDelayType = llvm.FunctionType.get(this.builder.getVoidTy(), [this.builder.getInt32Ty()], false);
    this.module.getOrInsertFunction('SDL_Delay', sdlDelayType);

    // Declare SDL_PollEvent
    const sdlPollEventType = llvm.FunctionType.get(this.builder.getInt32Ty(), [this.eventType.getPointerTo()], false);
    this.module.getOrInsertFunction('SDL_PollEvent', sdlPollEventType);

    // Declare exit
    const exitType = llvm.FunctionType.get(this.builder.getVoidTy(), [this.builder.getInt32Ty()], false);
    this.module.getOrInsertFunction('exit', exitType);

    // Declare SDL rendering functions
    const createRendererType = llvm.FunctionType.get(
      this.builder.getInt8PtrTy(),
      [this.builder.getInt8PtrTy(), this.builder.getInt32Ty(), this.builder.getInt32Ty()],
      false,
    );
    this.module.getOrInsertFunction('SDL_CreateRenderer', createRendererType);

    const setDrawColorType = llvm.FunctionType.get(
      this.builder.getInt32Ty(),
      [
        this.builder.getInt8PtrTy(),
        this.builder.getInt8Ty(),
        this.builder.getInt8Ty(),
        this.builder.getInt8Ty(),
        this.builder.getInt8Ty(),
      ],
      false,
    );
    this.module.getOrInsertFunction('SDL_SetRenderDrawColor', setDrawColorType);

    const drawPointType = llvm.FunctionType.get(
      this.builder.getInt32Ty(),
      [this.builder.getInt8PtrTy(), this.builder.getInt32Ty(), this.builder.getInt32Ty()],
      false,
    );
    this.module.getOrInsertFunction('SDL_RenderDrawPoint', drawPointType);

    const renderPresentType = llvm.FunctionType.get(this.builder.getVoidTy(), [this.builder.getInt8PtrTy()], false);
    this.module.getOrInsertFunction('SDL_RenderPresent', renderPresentType);

    const renderClearType = llvm.FunctionType.get(this.builder.getInt32Ty(), [this.builder.getInt8PtrTy()], false);
    this.module.getOrInsertFunction('SDL_RenderClear', renderClearType);

    const renderDrawLineType = llvm.FunctionType.get(
      this.builder.getInt32Ty(),
      [
        this.builder.getInt8PtrTy(),
        this.builder.getInt32Ty(),
        this.builder.getInt32Ty(),
        this.builder.getInt32Ty(),
        this.builder.getInt32Ty(),
      ],
      false,
    );
    this.module.getOrInsertFunction('SDL_RenderDrawLine', renderDrawLineType);

    // Declare math functions
    const sinType = llvm.FunctionType.get(this.builder.getDoubleTy(), [this.builder.getDoubleTy()], false);
    this.module.getOrInsertFunction('sin', sinType);

    const cosType = llvm.FunctionType.get(this.builder.getDoubleTy(), [this.builder.getDoubleTy()], false);
    this.module.getOrInsertFunction('cos', cosType);
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
      const value = this.builder.CreateLoad(
        varInfo.type === 'int' ? this.builder.getInt32Ty() : this.builder.getInt8PtrTy(),
        varInfo.value,
      );
      this.builder.CreateRet(value);
    } else if (stmt instanceof CallStatement) {
      const callee = this.module.getFunction(stmt.callee);
      if (!callee) {
        throw new Error(`Undefined function: ${stmt.callee}`);
      }

      const args = stmt.arguments.map((arg) => this.translateExpression(arg));
      const call = this.builder.CreateCall(callee, args, stmt.result ? 'call' : '');

      if (stmt.result) {
        // Store result in the pre-declared variable
        const resultVar = this.variables.get(stmt.result);
        if (!resultVar) {
          throw new Error(`Undefined result variable: ${stmt.result}`);
        }
        this.builder.CreateStore(call, resultVar.value);
      }
    } else if (stmt instanceof SDLInitStatement) {
      const sdlInitFunc = this.module.getFunction('SDL_Init');
      this.builder.CreateCall(sdlInitFunc, [this.builder.getInt32(32)]); // SDL_INIT_VIDEO
    } else if (stmt instanceof SDLWindowStatement) {
      const sdlCreateWindowFunc = this.module.getFunction('SDL_CreateWindow');
      const title = this.getStringConstant(stmt.title);
      const width = this.translateExpression(stmt.width);
      const height = this.translateExpression(stmt.height);
      // SDL_WINDOWPOS_UNDEFINED is -1 for x and y
      const window = this.builder.CreateCall(sdlCreateWindowFunc, [
        title,
        this.builder.getInt32(-1),
        this.builder.getInt32(-1),
        width,
        height,
        this.builder.getInt32(0),
      ]);
      if (!this.window) {
        this.window = new llvm.GlobalVariable(
          this.module,
          this.builder.getInt8PtrTy(),
          false,
          llvm.GlobalValue.LinkageTypes.CommonLinkage,
          llvm.ConstantPointerNull.get(this.builder.getInt8PtrTy()),
          'window',
        );
      }
      this.builder.CreateStore(window, this.window);
    } else if (stmt instanceof SDLDelayStatement) {
      const delay = this.translateExpression(stmt.delay);
      this.builder.CreateCall(this.module.getFunction('SDL_Delay'), [delay]);
    } else if (stmt instanceof SDLHandleEventsStatement) {
      // Poll for events and check for quit
      const eventPtr = this.builder.CreateAlloca(this.eventType, null, 'event');
      const pollResult = this.builder.CreateCall(this.module.getFunction('SDL_PollEvent'), [eventPtr]);
      // If pollResult != 0, check event.type == SDL_QUIT (256)
      const pollNonZero = this.builder.CreateICmpNE(pollResult, this.builder.getInt32(0));
      const thenBB = llvm.BasicBlock.Create(this.context, 'poll_true', this.function);
      const elseBB = llvm.BasicBlock.Create(this.context, 'poll_false', this.function);
      const quitBB = llvm.BasicBlock.Create(this.context, 'quit', this.function);
      this.builder.CreateCondBr(pollNonZero, thenBB, elseBB);

      this.builder.SetInsertPoint(thenBB);
      const typePtr = this.builder.CreateGEP(
        this.eventType,
        eventPtr,
        [this.builder.getInt32(0), this.builder.getInt32(0)],
        'typePtr',
      );
      const eventType = this.builder.CreateLoad(this.builder.getInt32Ty(), typePtr);
      const quitConst = this.builder.getInt32(256); // SDL_QUIT
      const isQuit = this.builder.CreateICmpEQ(eventType, quitConst);
      this.builder.CreateCondBr(isQuit, quitBB, elseBB);

      this.builder.SetInsertPoint(quitBB);
      const exitFunc = this.module.getFunction('exit');
      this.builder.CreateCall(exitFunc, [this.builder.getInt32(0)]);
      this.builder.CreateUnreachable();

      this.builder.SetInsertPoint(elseBB);
    } else if (stmt instanceof SDLCreateRendererStatement) {
      // Assume window is in variables or global
      // For simplicity, assume window is stored in a global
      // But since we don't have globals, perhaps store in variables
      // For now, assume window is the last created, but hard.
      // Let's add a global for window
      if (!this.window) {
        this.window = new llvm.GlobalVariable(
          this.module,
          this.builder.getInt8PtrTy(),
          false,
          llvm.GlobalValue.LinkageTypes.InternalLinkage,
          null,
          'window',
        );
      }
      const createRendererFunc = this.module.getFunction('SDL_CreateRenderer');
      const renderer = this.builder.CreateCall(createRendererFunc, [
        this.builder.CreateLoad(this.builder.getInt8PtrTy(), this.window),
        this.builder.getInt32(-1),
        this.builder.getInt32(0),
      ]);
      if (!this.renderer) {
        this.renderer = new llvm.GlobalVariable(
          this.module,
          this.builder.getInt8PtrTy(),
          false,
          llvm.GlobalValue.LinkageTypes.CommonLinkage,
          llvm.ConstantPointerNull.get(this.builder.getInt8PtrTy()),
          'renderer',
        );
      }
      this.builder.CreateStore(renderer, this.renderer);
    } else if (stmt instanceof SDLPutPixelStatement) {
      const setColorFunc = this.module.getFunction('SDL_SetRenderDrawColor');
      const r = this.builder.CreateTrunc(this.translateExpression(stmt.r), this.builder.getInt8Ty());
      const g = this.builder.CreateTrunc(this.translateExpression(stmt.g), this.builder.getInt8Ty());
      const b = this.builder.CreateTrunc(this.translateExpression(stmt.b), this.builder.getInt8Ty());
      this.builder.CreateCall(setColorFunc, [
        this.builder.CreateLoad(this.builder.getInt8PtrTy(), this.renderer),
        r,
        g,
        b,
        this.builder.getInt8(255),
      ]);

      const drawPointFunc = this.module.getFunction('SDL_RenderDrawPoint');
      const x = this.translateExpression(stmt.x);
      const y = this.translateExpression(stmt.y);
      this.builder.CreateCall(drawPointFunc, [
        this.builder.CreateLoad(this.builder.getInt8PtrTy(), this.renderer),
        x,
        y,
      ]);
    } else if (stmt instanceof SDLPresentStatement) {
      const presentFunc = this.module.getFunction('SDL_RenderPresent');
      this.builder.CreateCall(presentFunc, [this.builder.CreateLoad(this.builder.getInt8PtrTy(), this.renderer)]);
    } else if (stmt instanceof SDLClearStatement) {
      const clearFunc = this.module.getFunction('SDL_RenderClear');
      this.builder.CreateCall(clearFunc, [this.builder.CreateLoad(this.builder.getInt8PtrTy(), this.renderer)]);
    } else if (stmt instanceof SDLSetColorStatement) {
      const setColorFunc = this.module.getFunction('SDL_SetRenderDrawColor');
      const r = this.builder.CreateTrunc(this.translateExpression(stmt.r), this.builder.getInt8Ty());
      const g = this.builder.CreateTrunc(this.translateExpression(stmt.g), this.builder.getInt8Ty());
      const b = this.builder.CreateTrunc(this.translateExpression(stmt.b), this.builder.getInt8Ty());
      this.builder.CreateCall(setColorFunc, [
        this.builder.CreateLoad(this.builder.getInt8PtrTy(), this.renderer),
        r,
        g,
        b,
        this.builder.getInt8(255),
      ]);
    } else if (stmt instanceof SDLDrawLineStatement) {
      const drawLineFunc = this.module.getFunction('SDL_RenderDrawLine');
      const x1 = this.translateExpression(stmt.x1);
      const y1 = this.translateExpression(stmt.y1);
      const x2 = this.translateExpression(stmt.x2);
      const y2 = this.translateExpression(stmt.y2);
      this.builder.CreateCall(drawLineFunc, [
        this.builder.CreateLoad(this.builder.getInt8PtrTy(), this.renderer),
        x1,
        y1,
        x2,
        y2,
      ]);
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
      return this.builder.CreateLoad(
        varInfo.type === 'int' ? this.builder.getInt32Ty() : this.builder.getInt8PtrTy(),
        varInfo.value,
        expr.name,
      );
    } else if (expr instanceof NumericLiteral) {
      return this.builder.getInt32(expr.value);
    } else if (expr instanceof StringLiteral) {
      return this.getStringConstant(expr.value);
    } else if (expr instanceof BinaryExpression) {
      return this.translateBinaryExpression(expr);
    } else if (expr instanceof SinExpression) {
      const arg = this.translateExpression(expr.argument);
      const scale = this.translateExpression(expr.scale);
      const argDouble = this.builder.CreateSIToFP(arg, this.builder.getDoubleTy());
      const piOver180 = llvm.ConstantFP.get(this.builder.getDoubleTy(), Math.PI / 180.0);
      const radians = this.builder.CreateFMul(argDouble, piOver180);
      const sinFunc = this.module.getFunction('sin');
      const resultDouble = this.builder.CreateCall(sinFunc, [radians]);
      const scaleDouble = this.builder.CreateSIToFP(scale, this.builder.getDoubleTy());
      const scaled = this.builder.CreateFMul(resultDouble, scaleDouble);
      return this.builder.CreateFPToSI(scaled, this.builder.getInt32Ty());
    } else if (expr instanceof CosExpression) {
      const arg = this.translateExpression(expr.argument);
      const scale = this.translateExpression(expr.scale);
      const argDouble = this.builder.CreateSIToFP(arg, this.builder.getDoubleTy());
      const piOver180 = llvm.ConstantFP.get(this.builder.getDoubleTy(), Math.PI / 180.0);
      const radians = this.builder.CreateFMul(argDouble, piOver180);
      const cosFunc = this.module.getFunction('cos');
      const resultDouble = this.builder.CreateCall(cosFunc, [radians]);
      const scaleDouble = this.builder.CreateSIToFP(scale, this.builder.getDoubleTy());
      const scaled = this.builder.CreateFMul(resultDouble, scaleDouble);
      return this.builder.CreateFPToSI(scaled, this.builder.getInt32Ty());
    } else if (expr instanceof UnaryMinusExpression) {
      const value = this.translateExpression(expr.expression);
      return this.builder.CreateNeg(value);
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
      case '-':
        return this.builder.CreateSub(left, right, 'sub');
      case '*':
        return this.builder.CreateMul(left, right, 'mul');
      case '/': {
        const safeDen = this.builder.CreateSelect(
          this.builder.CreateICmpEQ(right, this.builder.getInt32(0)),
          this.builder.getInt32(1),
          right,
        );
        return this.builder.CreateSDiv(left, safeDen, 'div');
      }
      case '%':
        return this.builder.CreateSRem(left, right, 'rem');
      case '==':
        if (leftType === 'string' && rightType === 'string') {
          const cmp = this.stringCompare(left, right, 'eq');
          return this.builder.CreateZExt(cmp, this.builder.getInt32Ty(), 'eq');
        } else {
          const cmp = this.builder.CreateICmpEQ(left, right, 'eq');
          return this.builder.CreateZExt(cmp, this.builder.getInt32Ty(), 'eq');
        }
      case '!=':
        if (leftType === 'string' && rightType === 'string') {
          const cmp = this.stringCompare(left, right, 'ne');
          return this.builder.CreateZExt(cmp, this.builder.getInt32Ty(), 'ne');
        } else {
          const cmp = this.builder.CreateICmpNE(left, right, 'ne');
          return this.builder.CreateZExt(cmp, this.builder.getInt32Ty(), 'ne');
        }
      case '<':
        if (leftType === 'string' && rightType === 'string') {
          const cmp = this.stringCompare(left, right, 'lt');
          return this.builder.CreateZExt(cmp, this.builder.getInt32Ty(), 'lt');
        } else {
          const cmp = this.builder.CreateICmpSLT(left, right, 'lt');
          return this.builder.CreateZExt(cmp, this.builder.getInt32Ty(), 'lt');
        }
      case '<=':
        if (leftType === 'string' && rightType === 'string') {
          const cmp = this.stringCompare(left, right, 'le');
          return this.builder.CreateZExt(cmp, this.builder.getInt32Ty(), 'le');
        } else {
          const cmp = this.builder.CreateICmpSLE(left, right, 'le');
          return this.builder.CreateZExt(cmp, this.builder.getInt32Ty(), 'le');
        }
      case '>':
        if (leftType === 'string' && rightType === 'string') {
          const cmp = this.stringCompare(left, right, 'gt');
          return this.builder.CreateZExt(cmp, this.builder.getInt32Ty(), 'gt');
        } else {
          const cmp = this.builder.CreateICmpSGT(left, right, 'gt');
          return this.builder.CreateZExt(cmp, this.builder.getInt32Ty(), 'gt');
        }
      case '>=':
        if (leftType === 'string' && rightType === 'string') {
          const cmp = this.stringCompare(left, right, 'ge');
          return this.builder.CreateZExt(cmp, this.builder.getInt32Ty(), 'ge');
        } else {
          const cmp = this.builder.CreateICmpSGE(left, right, 'ge');
          return this.builder.CreateZExt(cmp, this.builder.getInt32Ty(), 'ge');
        }
      default:
        throw new Error(`Unknown operator: ${expr.operator}`);
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
    const totalLen = this.builder.CreateAdd(
      this.builder.CreateAdd(leftLen, rightLen, 'total'),
      this.builder.getInt64(1),
      'totalplus1',
    );
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
      case 'eq':
        return this.builder.CreateICmpEQ(result, this.builder.getInt32(0), 'streq');
      case 'ne':
        return this.builder.CreateICmpNE(result, this.builder.getInt32(0), 'strne');
      case 'lt':
        return this.builder.CreateICmpSLT(result, this.builder.getInt32(0), 'strlt');
      case 'le':
        return this.builder.CreateICmpSLE(result, this.builder.getInt32(0), 'strle');
      case 'gt':
        return this.builder.CreateICmpSGT(result, this.builder.getInt32(0), 'strgt');
      case 'ge':
        return this.builder.CreateICmpSGE(result, this.builder.getInt32(0), 'strge');
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
    } else if (expr instanceof SinExpression || expr instanceof CosExpression) {
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
    let boolCond = cond;
    if (!cond.getType().isIntegerTy(1)) {
      boolCond = this.builder.CreateICmpNE(cond, this.builder.getInt32(0));
    }

    const thenBB = llvm.BasicBlock.Create(this.context, 'then', this.function);
    const elseBB = llvm.BasicBlock.Create(this.context, 'else', this.function);
    const mergeBB = llvm.BasicBlock.Create(this.context, 'merge', this.function);

    this.builder.CreateCondBr(boolCond, thenBB, elseBB);

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
    let boolCond = cond;
    if (!cond.getType().isIntegerTy(1)) {
      boolCond = this.builder.CreateICmpNE(cond, this.builder.getInt32(0));
    }
    this.builder.CreateCondBr(boolCond, bodyBB, exitBB);

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
    const paramTypes = stmt.params.map((_param, i) => {
      const inferredType = signature[i] || 'int';
      return inferredType === 'string' ? this.builder.getInt8PtrTy() : this.builder.getInt32Ty();
    });

    // Create function type
    const funcType = llvm.FunctionType.get(returnType, paramTypes, false);

    // Create function
    const func = llvm.Function.Create(funcType, llvm.Function.LinkageTypes.InternalLinkage, stmt.name, this.module);

    // Create entry block
    const entryBB = llvm.BasicBlock.Create(this.context, 'entry', func);

    // Save current builder position, variables, and function
    const savedInsertPoint = this.builder.GetInsertBlock();
    const savedVariables = new Map(this.variables);
    const savedFunction = this.function;

    // Set up function scope
    this.function = func;
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
    this.function = savedFunction;
  }
}
