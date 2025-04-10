"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Compiler_1 = require("./Compiler");
// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const compileButton = document.getElementById('compileButton');
    const sourceCode = document.getElementById('sourceCode');
    const outputDiv = document.getElementById('output');
    if (compileButton && sourceCode && outputDiv) {
        compileButton.addEventListener('click', () => {
            const compiler = new Compiler_1.Compiler(sourceCode.value, outputDiv);
            compiler.compile();
        });
    }
});
//# sourceMappingURL=index.js.map