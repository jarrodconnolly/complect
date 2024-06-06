/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * GNU General Public License v3.0 (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)
*/
import llvm from 'llvm-bindings';

// node llvm.js > llvm.ll
// clang -o llvm llvm.ll
// ./llvm


// llc -march=wasm32 -filetype=obj llvm.ll
// wasm-ld llvm.o -o llvm.wasm --no-entry


function main() {
    const context = new llvm.LLVMContext();
    const module = new llvm.Module('demo', context);
    module.setTargetTriple('x86_64-apple-macosx12.0.0');
    const builder = new llvm.IRBuilder(context);

    const returnType = builder.getInt32Ty();
    // const paramTypes = [builder.getInt32Ty(), builder.getInt32Ty()];
    // const functionType = llvm.FunctionType.get(returnType, paramTypes, false);
    // const func = llvm.Function.Create(functionType, llvm.Function.LinkageTypes.ExternalLinkage, 'add', module);

    // const entryBB = llvm.BasicBlock.Create(context, 'entry', func);
    // builder.SetInsertPoint(entryBB);
    // const a = func.getArg(0);
    // const b = func.getArg(1);
    // const result = builder.CreateAdd(a, b);
    // builder.CreateRet(result);

    const printFuncType = llvm.FunctionType.get(builder.getInt32Ty(), [builder.getInt8PtrTy()], true);
    const printFunc = module.getOrInsertFunction('printf', printFuncType);
    const printArg = builder.CreateGlobalStringPtr('Hello World', '.str', 0, module);


    const functionType = llvm.FunctionType.get(returnType, [returnType], false);
    const func = llvm.Function.Create(functionType, llvm.Function.LinkageTypes.ExternalLinkage, 'main', module);
    const entryBB = llvm.BasicBlock.Create(context, 'entry', func);
    builder.SetInsertPoint(entryBB);
    builder.CreateCall(printFunc, [printArg], 'call');
    builder.CreateRet(builder.getInt32(0));

    if (llvm.verifyFunction(func)) {
        console.error('Verifying function failed');
        return;
    }
    if (llvm.verifyModule(module)) {
        console.error('Verifying module failed');
        return;
    }
    console.log(module.print());
}

main();