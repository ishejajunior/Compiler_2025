class Compile {
    constructor(sourceCode, outputDiv) {
        this.sourceCode = sourceCode;
        this.outputDiv = outputDiv;
        this.programCount = 1;
    }
    compile() {
        this.outputDiv.innerHTML = '';
        // Split source code into programs by '$'
        const programs = this.sourceCode.split('$').filter(prog => prog.trim().length > 0);
        let fullOutput = '';
        for (let i = 0; i < programs.length; i++) {
            const programNum = i + 1;
            fullOutput += `<h3>Program ${programNum}</h3>`;
            fullOutput += `<h4>Lexical Analysis</h4>`;
            // Lexical Analysis
            const lexer = new Lexer(programs[i] + '$');
            let tokens = [];
            try {
                let token;
                while ((token = lexer.getNextToken()).type !== 'EOF') {
                    tokens.push(token);
                    fullOutput += `<div>${lexer.formatToken(token.type, token.value)}</div>`;
                    if (lexer.currentErrorMessage) {
                        fullOutput += lexer.currentErrorMessage;
                        lexer.currentErrorMessage = '';
                    }
                }
                // Check if lexical analysis failed
                if (lexer.errors.length > 0) {
                    fullOutput += `<div style="color: red; font-weight: bold;">Lexical analysis failed with ${lexer.errors.length} error(s)</div>`;
                    fullOutput += '<hr>';
                    continue; // Move to next program
                }
                // If lexing succeeded, proceed with parsing
                fullOutput += `<div style="color: #4CAF50; font-weight: bold;">Lexical analysis completed successfully</div>`;
                fullOutput += `<h4>Parsing</h4>`;
                const parser = new Parser(tokens);
                parser.enableDebug((msg) => {
                    fullOutput += `<div style="color: #666; margin-left: 20px;">PARSER --> Parsing ${msg}</div>`;
                });
                const cst = parser.parseProgram();
                if (parser.getErrors().length > 0) {
                    // Display parsing errors
                    fullOutput += parser.getErrors().map(error => `<div style="color: red; font-weight: bold;">${error}</div>`).join('');
                    fullOutput += `<div style="color: red; font-weight: bold;">Parsing failed</div>`;
                    fullOutput += '<hr>';
                    continue; // Move to next program
                }
                else if (cst) {
                    // Display successful parse and CST
                    fullOutput += `<div style="color: #4CAF50; font-weight: bold;">Parsing completed successfully</div>`;
                    fullOutput += `<h4>Concrete Syntax Tree</h4>`;
                    fullOutput += `<pre style="
                        background-color: #2b2b2b;
                        color: #a9b7c6;
                        padding: 15px;
                        border-radius: 5px;
                        font-family: 'Consolas', monospace;
                        border: 1px solid #3c3f41;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        overflow: auto;
                        max-height: 500px;
                    ">${Parser.visualizeTree(cst)}</pre>`;
                    // Semantic Analysis
                    fullOutput += `<h4>Semantic Analysis</h4>`;
                    const semanticAnalyser = new SemanticAnalyser(tokens);
                    semanticAnalyser.enableDebug((msg) => {
                        fullOutput += `<div style="color: #666; margin-left: 20px;">SEMANTIC --> ${msg}</div>`;
                    });
                    const ast = semanticAnalyser.analyzeProgram();
                    if (semanticAnalyser.getErrors().length > 0) {
                        // Display semantic errors
                        fullOutput += semanticAnalyser.getErrors().map(error => `<div style="color: red; font-weight: bold;">${error}</div>`).join('');
                        fullOutput += `<div style="color: red; font-weight: bold;">Semantic analysis failed</div>`;
                    }
                    else if (semanticAnalyser.getWarnings().length > 0) {
                        // Display semantic warnings
                        fullOutput += semanticAnalyser.getWarnings().map(warning => `<div style="color: #FFB100; font-weight: bold;">${warning}</div>`).join('');
                    }
                    // Display semantic hints
                    if (semanticAnalyser.getHints().length > 0) {
                        fullOutput += semanticAnalyser.getHints().map(hint => `<div style="color: #00f2ff; font-weight: bold;">${hint}</div>`).join('');
                    }
                    if (ast) {
                        fullOutput += `<div style="color: #4CAF50; font-weight: bold;">Semantic analysis completed successfully</div>`;
                        // Display Symbol Table
                        fullOutput += `<h4>Symbol Table</h4>`;
                        const symbolTableData = semanticAnalyser.getSymbolTableData();
                        fullOutput += `<pre style="
                            background-color: #2b2b2b;
                            color: #a9b7c6;
                            padding: 15px;
                            border-radius: 5px;
                            font-family: 'Consolas', monospace;
                            border: 1px solid #3c3f41;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                            overflow: auto;
                            max-height: 500px;
                        ">${SemanticAnalyser.visualizeSymbolTable(symbolTableData)}</pre>`;
                        // Display Abstract Syntax Tree
                        fullOutput += `<h4>Abstract Syntax Tree</h4>`;
                        fullOutput += `<pre style="
                            background-color: #2b2b2b;
                            color: #a9b7c6;
                            padding: 15px;
                            border-radius: 5px;
                            font-family: 'Consolas', monospace;
                            border: 1px solid #3c3f41;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                            overflow: auto;
                            max-height: 500px;
                        ">${SemanticAnalyser.visualizeAST(ast)}</pre>`;
                    }
                }
            }
            catch (error) {
                fullOutput += `<div style="color: red; font-weight: bold;">Compiler Error in Program ${programNum}: ${error}</div>`;
            }
            fullOutput += '<hr>';
        }
        this.outputDiv.innerHTML = fullOutput;
    }
}
// Make class available globally
window.Compile = Compile;
//# sourceMappingURL=Compile.js.map