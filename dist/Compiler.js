"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Lexer_1 = require("./Lexer");
const parser_1 = require("./parser");
const SemanticAnalyser_1 = require("./SemanticAnalyser");
class Compiler {
    constructor(sourceCode, outputDiv) {
        this.sourceCode = sourceCode;
        this.outputDiv = outputDiv;
    }
    compile() {
        this.outputDiv.innerHTML = '';
        // Split source code into programs by '$'
        const programs = this.sourceCode.split('$').filter(prog => prog.trim().length > 0);
        let fullOutput = '';
        for (let i = 0; i < programs.length; i++) {
            const programNum = i + 1;
            fullOutput += this.compileProgram(programs[i], programNum);
        }
        this.outputDiv.innerHTML = fullOutput;
    }
    compileProgram(program, programNum) {
        let output = `<h3>Program ${programNum}</h3>`;
        output += `<h4>Lexical Analysis</h4>`;
        // Lexical Analysis
        const lexer = new Lexer_1.Lexer(program + '$');
        let tokens = [];
        try {
            let token;
            while ((token = lexer.getNextToken()).type !== 'EOF') {
                tokens.push(token);
                output += `<div>${lexer.formatToken(token.type, token.value)}</div>`;
                if (lexer.currentErrorMessage) {
                    output += lexer.currentErrorMessage;
                    lexer.currentErrorMessage = '';
                }
            }
            // Check if lexical analysis failed
            if (lexer.errors.length > 0) {
                output += `<div style="color: red; font-weight: bold;">Lexical analysis failed with ${lexer.errors.length} error(s)</div>`;
                output += '<hr>';
                return output;
            }
            // If lexing succeeded, proceed with parsing
            output += `<div style="color: #4CAF50; font-weight: bold;">Lexical analysis completed successfully</div>`;
            output += `<h4>Parsing</h4>`;
            const parser = new parser_1.Parser(tokens);
            parser.enableDebug((msg) => {
                output += `<div style="color: #666; margin-left: 20px;">PARSER --> Parsing ${msg}</div>`;
            });
            const cst = parser.parseProgram();
            if (parser.getErrors().length > 0) {
                // Display parsing errors
                output += parser.getErrors().map(error => `<div style="color: red; font-weight: bold;">${error}</div>`).join('');
                output += `<div style="color: red; font-weight: bold;">Parsing failed</div>`;
            }
            else if (cst) {
                // Display successful parse and CST
                output += `<div style="color: #4CAF50; font-weight: bold;">Parsing completed successfully</div>`;
                output += `<h4>Concrete Syntax Tree</h4>`;
                output += `<pre style="
                    background-color: #2b2b2b;
                    color: #a9b7c6;
                    padding: 15px;
                    border-radius: 5px;
                    font-family: 'Consolas', monospace;
                    border: 1px solid #3c3f41;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    overflow: auto;
                    max-height: 500px;
                ">${parser_1.Parser.visualizeTree(cst)}</pre>`;
                // Semantic Analysis
                output += `<h4>Semantic Analysis</h4>`;
                const semanticAnalyzer = new SemanticAnalyser_1.SemanticAnalyser(tokens);
                const ast = semanticAnalyzer.analyze();
                if (semanticAnalyzer.getErrors().length > 0) {
                    // Display semantic errors
                    output += semanticAnalyzer.getErrors().map(error => `<div style="color: red; font-weight: bold;">${error}</div>`).join('');
                    output += `<div style="color: red; font-weight: bold;">Semantic analysis failed</div>`;
                }
                else {
                    // Display semantic warnings if any
                    if (semanticAnalyzer.getWarnings().length > 0) {
                        output += semanticAnalyzer.getWarnings().map(warning => `<div style="color: #FFB100; font-weight: bold;">${warning}</div>`).join('');
                    }
                    // Display successful semantic analysis and AST
                    output += `<div style="color: #4CAF50; font-weight: bold;">Semantic analysis completed successfully</div>`;
                    output += `<h4>Abstract Syntax Tree</h4>`;
                    output += `<pre style="
                        background-color: #2b2b2b;
                        color: #a9b7c6;
                        padding: 15px;
                        border-radius: 5px;
                        font-family: 'Consolas', monospace;
                        border: 1px solid #3c3f41;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        overflow: auto;
                        max-height: 500px;
                    ">${SemanticAnalyser_1.SemanticAnalyser.visualizeTree(ast)}</pre>`;
                }
            }
        }
        catch (error) {
            output += `<div style="color: red; font-weight: bold;">Compiler Error in Program ${programNum}: ${error}</div>`;
        }
        output += '<hr>';
        return output;
    }
}
// Make class available globally
window.Compiler = Compiler;
//# sourceMappingURL=Compiler.js.map