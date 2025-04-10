// Import Token type from lexer
interface Token {
    type: string;
    value: string | null;
    line: number;
    column: number;
}

// Symbol table entry interface
interface SymbolTableEntry {
    type: string;
    isInitialized: boolean;
    line: number;
    column: number;
}

// Symbol table class
class SymbolTable {
    private table: Map<string, SymbolTableEntry>;
    public parent: SymbolTable | null;

    constructor(parent: SymbolTable | null = null) {
        this.table = new Map();
        this.parent = parent;
    }
    // Add a symbol to the table
    addSymbol(name: string, type: string, line: number, column: number): boolean {
        if (this.table.has(name)) {
            return false; // Symbol already exists in this scope
        }
        this.table.set(name, { type, isInitialized: false, line, column });
        return true;
    }

    // Look up a symbol in the current scope and parent scopes
    lookupSymbol(name: string): SymbolTableEntry | null {
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
    markInitialized(name: string): boolean {
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
    getSymbols(): Map<string, SymbolTableEntry> {
        return this.table;
    }
}

// AST Node interface
interface ASTNode {
    type: string;
    value?: string;
    children: ASTNode[];
    line?: number;
    column?: number;
}

class SemanticAnalyser {
    private tokens: Token[];
    private currentTokenIndex: number;
    private errors: string[];
    private warnings: string[];
    private symbolTable: SymbolTable;
    private ast: ASTNode | null;
    private debugCallback?: (message: string) => void;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
        this.currentTokenIndex = 0;
        this.errors = [];
        this.warnings = [];
        this.symbolTable = new SymbolTable();
        this.ast = null;
    }

    // Helper methods
    private getCurrentToken(): Token {
        if (this.currentTokenIndex >= this.tokens.length) {
            return new Token('EOF', null);
        }
        return this.tokens[this.currentTokenIndex];
    }

    private advance(): void {
        if (this.currentTokenIndex < this.tokens.length) {
            this.currentTokenIndex++;
        }
    }

    private addError(message: string, line: number, column: number): void {
        this.errors.push(`SEMANTIC --> Error: ${message} at line ${line}:${column}`);
        this.debug(`ERROR: ${message} at line ${line}:${column}`);
    }

    private addWarning(message: string, line: number, column: number): void {
        this.warnings.push(`SEMANTIC --> Warning: ${message} at line ${line}:${column}`);
        this.debug(`WARNING: ${message} at line ${line}:${column}`);
    }

    // Semantic analysis methods
    analyzeProgram(): ASTNode | null {
        this.debug('Starting semantic analysis');
        const programNode: ASTNode = {
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
            this.addError("Expected end of program symbol '$'", 
                this.getCurrentToken().line, 
                this.getCurrentToken().column);
            return null;
        }

        this.ast = programNode;
        return programNode;
    }

    private analyzeBlock(): ASTNode | null {
        const blockNode: ASTNode = {
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
            } else {
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

    private analyzeStatement(): ASTNode | null {
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

    private analyzeVarDecl(): ASTNode | null {
        const typeToken = this.getCurrentToken();
        this.advance();

        const idToken = this.getCurrentToken();
        if (idToken.type !== 'ID') {
            this.addError("Expected identifier after type declaration", 
                idToken.line, 
                idToken.column);
            return null;
        }

        // Add to symbol table
        if (!this.symbolTable.addSymbol(idToken.value!, typeToken.value!, 
            idToken.line, idToken.column)) {
            this.addError(`Variable '${idToken.value}' already declared in this scope`, 
                idToken.line, 
                idToken.column);
        }

        this.advance();

        return {
            type: 'VarDecl',
            value: typeToken.value,
            children: [{
                type: 'Id',
                value: idToken.value!,
                line: idToken.line,
                column: idToken.column,
                children: []
            }]
        };
    }

    private analyzeAssignment(): ASTNode | null {
        const idToken = this.getCurrentToken();
        const symbol = this.symbolTable.lookupSymbol(idToken.value!);
        
        if (!symbol) {
            this.addError(`Variable '${idToken.value}' not declared`, 
                idToken.line, 
                idToken.column);
        }

        this.advance();
        
        if (this.getCurrentToken().type !== 'ASSIGN') {
            this.addError("Expected '=' in assignment", 
                this.getCurrentToken().line, 
                this.getCurrentToken().column);
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
            // Handle boolean expressions
            else if (expectedType === 'boolean' && actualType === 'boolexpr') {
                // This is valid
            }
            else if (expectedType !== actualType) {
                this.addError(`Type mismatch: cannot assign ${actualType} to ${expectedType}`, 
                    idToken.line, 
                    idToken.column);
            }
        }

        // Mark as initialized
        if (symbol) {
            this.symbolTable.markInitialized(idToken.value!);
        }

        return {
            type: 'Assignment',
            children: [
                {
                    type: 'Id',
                    value: idToken.value!,
                    line: idToken.line,
                    column: idToken.column,
                    children: []
                },
                exprNode
            ]
        };
    }

    private analyzeExpression(): ASTNode | null {
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
                this.addError("Expected ')' after expression", 
                    token.line, 
                    token.column);
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
                const symbol = this.symbolTable.lookupSymbol(token.value!);
                if (!symbol) {
                    this.addError(`Variable '${token.value}' not declared`, 
                        token.line, 
                        token.column);
                } else if (!symbol.isInitialized) {
                    this.addWarning(`Variable '${token.value}' might not be initialized`, 
                        token.line, 
                        token.column);
                }
                this.advance();
                return {
                    type: 'Id',
                    value: token.value!,
                    line: token.line,
                    column: token.column,
                    children: []
                };
            default:
                this.debug(`Unexpected token type in expression: ${token.type}`);
                this.addError(`Unexpected token in expression: ${token.type}`, 
                    token.line, 
                    token.column);
                return null;
        }
    }



