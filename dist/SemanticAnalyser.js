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
        this.table.set(name, { type, isInitialized: false, line, column });
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
}
//# sourceMappingURL=SemanticAnalyser.js.map