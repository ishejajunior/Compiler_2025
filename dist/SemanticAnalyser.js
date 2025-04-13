// Symbol table class
class SymbolTable {
    constructor(parent = null) {
        this.table = new Map();
        this.parent = parent;
    }
    // Add a symbol to the table
    addSymbol(name, type, line, column) {
        if (this.table.has(name)) {
            return false; // Symbol already exists in this scope
        }
        this.table.set(name, { type, isInitialized: false, isUsed: false, line, column });
        return true;
    }
    // Look up a symbol in the current scope and parent scopes
    lookupSymbol(name) {
        const entry = this.table.get(name);
        if (entry) {
            return entry;
        }
        if (this.parent) {
            return this.parent.lookupSymbol(name);
        }
        return null;
    }
    // Mark a symbol as initialized
    markInitialized(name) {
        const entry = this.table.get(name);
        if (entry) {
            entry.isInitialized = true;
            return true;
        }
        if (this.parent) {
            return this.parent.markInitialized(name);
        }
        return false;
    }
    // Mark a symbol as used
    markUsed(name) {
        const entry = this.table.get(name);
        if (entry) {
            entry.isUsed = true;
            return true;
        }
        if (this.parent) {
            return this.parent.markUsed(name);
        }
        return false;
    }
    // Get all symbols in the current scope
    getSymbols() {
        return this.table;
    }
}
class SemanticAnalyser {
    constructor(tokens) {
        this.tokens = tokens;
        this.currentTokenIndex = 0;
        this.errors = [];
        this.warnings = [];
        this.symbolTable = new SymbolTable();
        this.ast = null;
    }
    // Helper methods
    getCurrentToken() {
        if (this.currentTokenIndex >= this.tokens.length) {
            return new Token('EOF', null);
        }
        return this.tokens[this.currentTokenIndex];
    }
    advance() {
        if (this.currentTokenIndex < this.tokens.length) {
            this.currentTokenIndex++;
        }
    }
    addError(message, line, column) {
        this.errors.push(`SEMANTIC --> Error: ${message} at line ${line}:${column}`);
        this.debug(`ERROR: ${message} at line ${line}:${column}`);
    }
    addWarning(message, line, column) {
        this.warnings.push(`SEMANTIC --> Warning: ${message} at line ${line}:${column}`);
        this.debug(`WARNING: ${message} at line ${line}:${column}`);
    }
    // Semantic analysis methods
    analyzeProgram() {
        this.debug('Starting semantic analysis');
        const programNode = {
            type: 'Program',
            children: []
        };
        // Analyze the block
        const blockNode = this.analyzeBlock();
        if (blockNode) {
            programNode.children.push(blockNode);
        }
        // Check for EOP
        if (this.getCurrentToken().type !== 'EOP') {
            this.addError("Expected end of program symbol '$'", this.getCurrentToken().line, this.getCurrentToken().column);
            return null;
        }
        // Check for unused variables
        this.checkUnusedVariables();
        this.ast = programNode;
        return programNode;
    }
    analyzeBlock() {
        const blockNode = {
            type: 'Block',
            children: []
        };
        // Create a new scope for the block, but preserve the parent scope
        const previousSymbolTable = this.symbolTable;
        this.symbolTable = new SymbolTable(previousSymbolTable);
        // Expect opening brace
        if (!this.expect('LBRACE', "Expected '{' at start of block")) {
            return null;
        }
        // Analyze statements until we find the closing brace
        while (this.getCurrentToken().type !== 'RBRACE' &&
            this.getCurrentToken().type !== 'EOF') {
            const stmtNode = this.analyzeStatement();
            if (stmtNode) {
                blockNode.children.push(stmtNode);
            }
            else {
                // If we couldn't parse a statement, try to recover by advancing
                this.advance();
            }
        }
        // Expect closing brace
        if (!this.expect('RBRACE', "Expected '}' at end of block")) {
            return null;
        }
        // Don't restore the previous scope here - we want to keep all symbols
        // for the symbol table display
        // this.symbolTable = previousSymbolTable;
        return blockNode;
    }
    analyzeStatement() {
        const token = this.getCurrentToken();
        switch (token.type) {
            case 'TYPE':
                return this.analyzeVarDecl();
            case 'ID':
                return this.analyzeAssignment();
            case 'PRINT':
                return this.analyzePrint();
            case 'WHILE':
                return this.analyzeWhile();
            case 'IF':
                return this.analyzeIf();
            case 'LBRACE':
                return this.analyzeBlock();
            case 'RBRACE':
                // End of block, return null to stop statement analysis
                return null;
            default:
                this.addError(`Unexpected token: ${token.type}`, token.line, token.column);
                return null;
        }
    }
    analyzeVarDecl() {
        const typeToken = this.getCurrentToken();
        this.advance();
        const idToken = this.getCurrentToken();
        if (idToken.type !== 'ID') {
            this.addError("Expected identifier after type declaration", idToken.line, idToken.column);
            return null;
        }
        // Add to symbol table
        if (!this.symbolTable.addSymbol(idToken.value, typeToken.value, idToken.line, idToken.column)) {
            this.addError(`Variable '${idToken.value}' already declared in this scope`, idToken.line, idToken.column);
        }
        this.advance();
        return {
            type: 'VarDecl',
            value: typeToken.value,
            children: [{
                    type: 'Id',
                    value: idToken.value,
                    line: idToken.line,
                    column: idToken.column,
                    children: []
                }]
        };
    }
    analyzeAssignment() {
        const idToken = this.getCurrentToken();
        const symbol = this.symbolTable.lookupSymbol(idToken.value);
        if (!symbol) {
            this.addError(`Variable '${idToken.value}' not declared`, idToken.line, idToken.column);
        }
        this.advance();
        if (this.getCurrentToken().type !== 'ASSIGN') {
            this.addError("Expected '=' in assignment", this.getCurrentToken().line, this.getCurrentToken().column);
            return null;
        }
        this.advance();
        const exprNode = this.analyzeExpression();
        if (!exprNode) {
            return null;
        }
        // Type checking - normalize types
        if (symbol) {
            const expectedType = symbol.type.toLowerCase();
            const actualType = exprNode.type.toLowerCase();
            // Handle int expressions
            if (expectedType === 'int' && (actualType === 'intexpr' || actualType === 'digit')) {
                // This is valid
            }
            // Handle string expressions
            else if (expectedType === 'string' && actualType === 'stringexpr') {
                // This is valid
            }
            // Handle boolean expressions and literals
            else if (expectedType === 'boolean' && (actualType === 'boolexpr' || actualType === 'boolval')) {
                // This is valid
            }
            // Handle direct type matches
            else if (expectedType === actualType) {
                // This is valid
            }
            else {
                this.addError(`Type mismatch: cannot assign ${actualType} to ${expectedType}`, idToken.line, idToken.column);
            }
        }
        // Mark as initialized
        if (symbol) {
            this.symbolTable.markInitialized(idToken.value);
        }
        return {
            type: 'Assignment',
            children: [
                {
                    type: 'Id',
                    value: idToken.value,
                    line: idToken.line,
                    column: idToken.column,
                    children: []
                },
                exprNode
            ]
        };
    }
    analyzeExpression() {
        const token = this.getCurrentToken();
        this.debug(`Analyzing expression starting with token: ${token.type} [${token.value}]`);
        // Handle parenthesized expressions
        if (token.type === 'LPAREN') {
            this.debug("Found opening parenthesis in expression");
            this.advance();
            const expr = this.analyzeExpression();
            if (!expr) {
                this.debug("Failed to parse expression inside parentheses");
                return null;
            }
            this.debug(`Successfully parsed expression inside parentheses: ${expr.type}`);
            this.debug(`Current token after parenthesized expression: ${this.getCurrentToken().type}`);
            if (this.getCurrentToken().type !== 'RPAREN') {
                this.addError("Expected ')' after expression", token.line, token.column);
                return null;
            }
            this.debug("Found closing parenthesis in expression");
            this.advance();
            return expr;
        }
        // Handle basic expressions
        switch (token.type) {
            case 'DIGIT':
                this.debug("Found digit in expression");
                return this.analyzeIntExpr();
            case 'QUOTE':
                this.debug("Found quote in expression");
                return this.analyzeStringExpr();
            case 'BOOLVAL':
                this.debug("Found boolean value in expression");
                return this.analyzeBoolExpr();
            case 'ID':
                this.debug(`Found identifier in expression: ${token.value}`);
                const symbol = this.symbolTable.lookupSymbol(token.value);
                if (!symbol) {
                    this.addError(`Variable '${token.value}' not declared`, token.line, token.column);
                }
                else if (!symbol.isInitialized) {
                    this.addWarning(`Variable '${token.value}' might not be initialized`, token.line, token.column);
                }
                // Mark the variable as used
                this.symbolTable.markUsed(token.value);
                this.advance();
                return {
                    type: 'Id',
                    value: token.value,
                    line: token.line,
                    column: token.column,
                    children: []
                };
            default:
                this.debug(`Unexpected token type in expression: ${token.type}`);
                this.addError(`Unexpected token in expression: ${token.type}`, token.line, token.column);
                return null;
        }
    }
    analyzeIntExpr() {
        const token = this.getCurrentToken();
        this.debug(`Analyzing integer expression starting with: ${token.type} [${token.value}]`);
        // First parse the left operand
        let leftExpr = null;
        // Handle parenthesized expressions
        if (token.type === 'LPAREN') {
            this.debug("Found opening parenthesis in integer expression");
            this.advance();
            leftExpr = this.analyzeExpression();
            if (!leftExpr) {
                this.debug("Failed to parse expression inside parentheses");
                return null;
            }
            // Check if the expression inside parentheses is an integer
            const exprType = this.getExpressionType(leftExpr);
            if (exprType !== 'int') {
                this.addError(`Invalid type in arithmetic expression: expected int, got ${exprType}`, token.line, token.column);
                return null;
            }
            if (this.getCurrentToken().type !== 'RPAREN') {
                this.addError("Expected ')' after expression", this.getCurrentToken().line, this.getCurrentToken().column);
                return null;
            }
            this.debug("Found closing parenthesis in integer expression");
            this.advance();
        }
        // Handle basic integer expressions
        else if (token.type === 'DIGIT') {
            this.debug(`Found digit: ${token.value}`);
            leftExpr = {
                type: 'IntExpr',
                value: token.value,
                children: []
            };
            this.advance();
        }
        // Handle identifier
        else if (token.type === 'ID') {
            const symbol = this.symbolTable.lookupSymbol(token.value);
            if (!symbol) {
                this.addError(`Undeclared variable: ${token.value}`, token.line, token.column);
                return null;
            }
            if (symbol.type !== 'int') {
                this.addError(`Invalid type in arithmetic expression: expected int, got ${symbol.type}`, token.line, token.column);
                return null;
            }
            this.debug(`Found integer variable: ${token.value}`);
            leftExpr = {
                type: 'IntExpr',
                value: token.value,
                children: []
            };
            this.advance();
        }
        else {
            this.addError("Expected integer expression", token.line, token.column);
            return null;
        }
        // Check for arithmetic operator
        if (this.getCurrentToken().type === 'INTOP') {
            const op = this.getCurrentToken().value;
            this.debug(`Found arithmetic operator: ${op}`);
            this.advance();
            // Parse right operand
            const rightExpr = this.analyzeIntExpr();
            if (!rightExpr) {
                this.debug("Failed to parse right side of arithmetic expression");
                return null;
            }
            // Check if right expression is an integer
            const rightType = this.getExpressionType(rightExpr);
            if (rightType !== 'int') {
                this.addError(`Invalid type in arithmetic expression: expected int, got ${rightType}`, token.line, token.column);
                return null;
            }
            return {
                type: 'IntExpr',
                value: op,
                children: [leftExpr, rightExpr]
            };
        }
        // If no operator, return the left expression
        return leftExpr;
    }
    analyzeStringExpr() {
        const exprNode = {
            type: 'StringExpr',
            children: []
        };
        this.advance(); // Skip opening quote
        while (this.getCurrentToken().type !== 'QUOTE' &&
            this.getCurrentToken().type !== 'EOF') {
            if (this.getCurrentToken().type === 'CHAR' ||
                this.getCurrentToken().type === 'SPACE') {
                exprNode.children.push({
                    type: 'Char',
                    value: this.getCurrentToken().value,
                    children: []
                });
                this.advance();
            }
            else {
                this.addError("Invalid character in string", this.getCurrentToken().line, this.getCurrentToken().column);
                return null;
            }
        }
        if (this.getCurrentToken().type !== 'QUOTE') {
            this.addError("Unterminated string", this.getCurrentToken().line, this.getCurrentToken().column);
            return null;
        }
        this.advance(); // Skip closing quote
        return exprNode;
    }
    analyzeBoolExpr() {
        const token = this.getCurrentToken();
        this.debug(`Analyzing boolean expression starting with: ${token.type} [${token.value}]`);
        // Handle parenthesized boolean expressions
        if (token.type === 'LPAREN') {
            this.debug("Found opening parenthesis in boolean expression");
            this.advance();
            // Parse left expression
            const leftExpr = this.analyzeExpression();
            if (!leftExpr) {
                this.debug("Failed to parse left side of boolean expression");
                return null;
            }
            this.debug(`Successfully parsed left side: ${leftExpr.type}`);
            // Check for boolean operator
            if (this.getCurrentToken().type !== 'BOOLOP') {
                this.addError("Expected boolean operator (== or !=)", this.getCurrentToken().line, this.getCurrentToken().column);
                return null;
            }
            const op = this.getCurrentToken().value;
            this.debug(`Found boolean operator: ${op}`);
            this.advance();
            // Parse right expression
            const rightExpr = this.analyzeExpression();
            if (!rightExpr) {
                this.debug("Failed to parse right side of boolean expression");
                return null;
            }
            this.debug(`Successfully parsed right side: ${rightExpr.type}`);
            // Type checking for boolean expressions
            const leftType = this.getExpressionType(leftExpr);
            const rightType = this.getExpressionType(rightExpr);
            // Check if types are compatible for comparison
            if (!this.areTypesComparable(leftType, rightType)) {
                this.addError(`Invalid type comparison: cannot compare ${leftType} with ${rightType}`, token.line, token.column);
            }
            // Check for closing parenthesis
            if (this.getCurrentToken().type !== 'RPAREN') {
                this.addError("Expected ')' after boolean expression", this.getCurrentToken().line, this.getCurrentToken().column);
                return null;
            }
            this.debug("Found closing parenthesis in boolean expression");
            this.advance();
            return {
                type: 'boolexpr',
                value: op,
                children: [leftExpr, rightExpr]
            };
        }
        // Handle boolean literals
        if (token.type === 'BOOLVAL') {
            this.debug(`Found boolean literal: ${token.value}`);
            this.advance();
            return {
                type: 'boolval',
                value: token.value,
                children: []
            };
        }
        this.addError("Expected boolean expression", token.line, token.column);
        return null;
    }
    getExpressionType(expr) {
        switch (expr.type) {
            case 'IntExpr':
            case 'Digit':
                return 'int';
            case 'StringExpr':
                return 'string';
            case 'BoolExpr':
            case 'BoolVal':
                return 'boolean';
            case 'Id':
                const symbol = this.symbolTable.lookupSymbol(expr.value);
                return symbol ? symbol.type : 'unknown';
            default:
                return 'unknown';
        }
    }
    areTypesComparable(type1, type2) {
        // Normalize types
        type1 = type1.toLowerCase();
        type2 = type2.toLowerCase();
        // Same types are always comparable
        if (type1 === type2) {
            return true;
        }
        // Specific type comparison rules
        if (type1 === 'int' && type2 === 'int') {
            return true;
        }
        if (type1 === 'string' && type2 === 'string') {
            return true;
        }
        if (type1 === 'boolean' && type2 === 'boolean') {
            return true;
        }
        // All other combinations are invalid
        return false;
    }
    analyzePrint() {
        this.debug(`Analyzing print statement at line ${this.getCurrentToken().line}`);
        this.advance(); // Skip 'print'
        if (this.getCurrentToken().type !== 'LPAREN') {
            this.addError("Expected '(' after 'print'", this.getCurrentToken().line, this.getCurrentToken().column);
            return null;
        }
        this.debug("Found opening parenthesis");
        this.advance();
        // Parse the expression inside the print statement
        this.debug("Starting to parse expression inside print");
        const exprNode = this.analyzeExpression();
        if (!exprNode) {
            this.debug("Failed to parse expression in print statement");
            return null;
        }
        this.debug(`Successfully parsed expression of type ${exprNode.type}`);
        // Check for closing parenthesis
        this.debug(`Current token after expression: ${this.getCurrentToken().type}`);
        if (this.getCurrentToken().type !== 'RPAREN') {
            this.addError("Expected ')' after expression", this.getCurrentToken().line, this.getCurrentToken().column);
            return null;
        }
        this.debug("Found closing parenthesis");
        this.advance();
        return {
            type: 'PrintStatement',
            children: [exprNode]
        };
    }
    analyzeIf() {
        this.debug(`Analyzing if statement at line ${this.getCurrentToken().line}`);
        this.advance(); // Skip 'if'
        // Parse the boolean expression
        const conditionNode = this.analyzeBoolExpr();
        if (!conditionNode) {
            this.debug("Failed to parse if condition");
            return null;
        }
        this.debug(`Successfully parsed if condition: ${conditionNode.type}`);
        const blockNode = this.analyzeBlock();
        if (!blockNode) {
            this.debug("Failed to parse if block");
            return null;
        }
        this.debug("Successfully parsed if block");
        return {
            type: 'IfStatement',
            children: [conditionNode, blockNode]
        };
    }
    analyzeWhile() {
        this.debug(`Analyzing while statement at line ${this.getCurrentToken().line}`);
        this.advance(); // Skip 'while'
        // Parse the boolean expression
        const conditionNode = this.analyzeBoolExpr();
        if (!conditionNode) {
            this.debug("Failed to parse while condition");
            return null;
        }
        this.debug(`Successfully parsed while condition: ${conditionNode.type}`);
        const blockNode = this.analyzeBlock();
        if (!blockNode) {
            this.debug("Failed to parse while block");
            return null;
        }
        this.debug("Successfully parsed while block");
        return {
            type: 'WhileStatement',
            children: [conditionNode, blockNode]
        };
    }
    expect(expectedType, errorMessage) {
        const token = this.getCurrentToken();
        if (token.type === expectedType) {
            this.advance();
            return true;
        }
        this.addError(errorMessage, token.line, token.column);
        return false;
    }
    // Helper to visualize the AST
    static visualizeAST(node, indent = '') {
        const nodeColor = '#FFA500'; // Orange for node names
        const valueColor = '#6A8759'; // Green for values
        const indentColor = '#606366'; // Grey for indent lines
        let result = `<span style="color: ${indentColor}">${indent}</span>`;
        result += `<span style="color: ${nodeColor}">${node.type}</span>`;
        if (node.value) {
            result += `<span style="color: ${valueColor}"> [${node.value}]</span>`;
        }
        result += '\n';
        for (const child of node.children) {
            result += SemanticAnalyser.visualizeAST(child, indent + '  ');
        }
        return result;
    }
    enableDebug(callback) {
        this.debugCallback = callback;
    }
    debug(message) {
        if (this.debugCallback) {
            this.debugCallback(message);
        }
    }
    getErrors() {
        return this.errors;
    }
    getWarnings() {
        return this.warnings;
    }
    getAST() {
        return this.ast;
    }
    getSymbolTableData() {
        const symbols = [];
        // First find all scopes in the hierarchy
        const scopes = [];
        let currentTable = this.symbolTable;
        while (currentTable) {
            scopes.unshift(currentTable); // Add to beginning to maintain order
            currentTable = currentTable.parent;
        }
        // Now collect symbols from each scope with the correct scope number
        scopes.forEach((table, index) => {
            this.debug(`Collecting symbols from scope ${index}`);
            this.debug(`Current table has ${table.getSymbols().size} symbols`);
            // Collect symbols from current scope
            table.getSymbols().forEach((symbol, name) => {
                this.debug(`Adding symbol ${name} to scope ${index}`);
                symbols.push({
                    name: name,
                    type: symbol.type,
                    initialized: symbol.isInitialized,
                    line: symbol.line,
                    column: symbol.column,
                    scopeLevel: index
                });
            });
        });
        // Sort symbols by scope level (innermost first)
        const sortedSymbols = symbols.sort((a, b) => b.scopeLevel - a.scopeLevel);
        this.debug(`Final symbol table has ${sortedSymbols.length} symbols`);
        sortedSymbols.forEach(s => this.debug(`Symbol ${s.name} in scope ${s.scopeLevel}`));
        return sortedSymbols;
    }
    static visualizeSymbolTable(symbols) {
        if (symbols.length === 0) {
            return "Symbol Table is empty";
        }
        const maxNameLength = Math.max(...symbols.map(s => s.name.length), 4);
        const maxTypeLength = Math.max(...symbols.map(s => s.type.length), 4);
        let table = "┌" + "─".repeat(maxNameLength + 2) + "┬" +
            "─".repeat(maxTypeLength + 2) + "┬" +
            "─".repeat(12) + "┬" +
            "─".repeat(8) + "┬" +
            "─".repeat(8) + "┐\n";
        table += "│ " + "Name".padEnd(maxNameLength) + " │ " +
            "Type".padEnd(maxTypeLength) + " │ " +
            "Initialized".padEnd(10) + " │ " +
            "Location".padEnd(6) + " │ " +
            "Scope".padEnd(6) + " │\n";
        table += "├" + "─".repeat(maxNameLength + 2) + "┼" +
            "─".repeat(maxTypeLength + 2) + "┼" +
            "─".repeat(12) + "┼" +
            "─".repeat(8) + "┼" +
            "─".repeat(8) + "┤\n";
        symbols.forEach(symbol => {
            table += "│ " + symbol.name.padEnd(maxNameLength) + " │ " +
                symbol.type.padEnd(maxTypeLength) + " │ " +
                (symbol.initialized ? "Yes" : "No").padEnd(10) + " │ " +
                `${symbol.line}:${symbol.column}`.padEnd(6) + " │ " +
                `Scope ${symbol.scopeLevel}`.padEnd(6) + " │\n";
        });
        table += "└" + "─".repeat(maxNameLength + 2) + "┴" +
            "─".repeat(maxTypeLength + 2) + "┴" +
            "─".repeat(12) + "┴" +
            "─".repeat(8) + "┴" +
            "─".repeat(8) + "┘";
        return table;
    }
    // Add this method to check for unused variables
    checkUnusedVariables() {
        const collectUnused = (table) => {
            table.getSymbols().forEach((symbol, name) => {
                if (!symbol.isUsed) {
                    this.addWarning(`Variable '${name}' is declared but never used`, symbol.line, symbol.column);
                }
            });
            if (table.parent) {
                collectUnused(table.parent);
            }
        };
        collectUnused(this.symbolTable);
    }
}
// Make class available globally
window.SemanticAnalyser = SemanticAnalyser;
//# sourceMappingURL=SemanticAnalyser.js.map