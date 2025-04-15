// Import Token type from lexer
interface Token {
    type: string;
    value: string | null;
    line: number;
    column: number;
}

// Token class implementation
class TokenImpl implements Token {
    type: string;
    value: string | null;
    line: number;
    column: number;

    constructor(type: string, value: string | null, line: number = 0, column: number = 0) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.column = column;
    }
}

// Symbol table entry interface
interface SymbolTableEntry {
    name: string;    // Adding name to the entry itself
    type: string;
    isInitialized: boolean;
    isUsed: boolean;
    line: number;
    column: number;
}

// Enhanced Symbol table class with proper scope management
class SymbolTable {
    private symbols: Map<string, SymbolTableEntry>;
    private parent: SymbolTable | null;
    private scopeLevel: number;
    private children: SymbolTable[];

    constructor(parent: SymbolTable | null = null) {
        this.symbols = new Map();
        this.parent = parent;
        this.children = [];
        
        // Calculate scope level based on parent
        this.scopeLevel = parent ? parent.scopeLevel + 1 : 0;
        
        // Register as child of parent
        if (parent) {
            parent.addChild(this);
        }
    }

    // Register a child scope
    private addChild(child: SymbolTable): void {
        this.children.push(child);
    }

    // Get the scope level of this symbol table
    getScopeLevel(): number {
        return this.scopeLevel;
    }

    // Create a new nested scope
    enterScope(): SymbolTable {
        return new SymbolTable(this);
    }

    // Return to parent scope
    exitScope(): SymbolTable | null {
        return this.parent;
    }

    // Add a symbol to the table
    addSymbol(name: string, type: string, line: number, column: number): boolean {
        if (this.symbols.has(name)) {
            return false; // Symbol already exists in this scope
        }
        this.symbols.set(name, { 
            name, 
            type, 
            isInitialized: false, 
            isUsed: false, 
            line, 
            column 
        });
        return true;
    }

    // Look up a symbol in the current scope only
    lookupSymbolInCurrentScope(name: string): SymbolTableEntry | null {
        return this.symbols.get(name) || null;
    }

    // Look up a symbol in the current scope and parent scopes
    lookupSymbol(name: string): SymbolTableEntry | null {
        const entry = this.symbols.get(name);
        if (entry) {
            return entry;
        }
        if (this.parent) {
            return this.parent.lookupSymbol(name);
        }
        return null;
    }

    // Check if a symbol is defined in any scope
    isDefined(name: string): boolean {
        return this.lookupSymbol(name) !== null;
    }

    // Mark a symbol as initialized
    markInitialized(name: string): boolean {
        const entry = this.symbols.get(name);
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
    markUsed(name: string): boolean {
        const entry = this.symbols.get(name);
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
    getSymbols(): Map<string, SymbolTableEntry> {
        return this.symbols;
    }

    // Get all child scopes
    getChildScopes(): SymbolTable[] {
        return this.children;
    }

    // Get parent scope
    getParentScope(): SymbolTable | null {
        return this.parent;
    }

    // Get all symbols with their scope levels
    getAllSymbols(): Array<{ symbol: SymbolTableEntry, scopeLevel: number }> {
        const result: Array<{ symbol: SymbolTableEntry, scopeLevel: number }> = [];
        
        // Add symbols from this scope
        this.symbols.forEach(symbol => {
            result.push({
                symbol,
                scopeLevel: this.scopeLevel
            });
        });
        
        // Recursively add symbols from child scopes
        for (const child of this.children) {
            result.push(...child.getAllSymbols());
        }
        
        return result;
    }
    
    // Get all unused symbols in this scope and child scopes
    getUnusedSymbols(): Array<{ symbol: SymbolTableEntry, scopeLevel: number }> {
        const result: Array<{ symbol: SymbolTableEntry, scopeLevel: number }> = [];
        
        // Check symbols in this scope
        this.symbols.forEach(symbol => {
            if (!symbol.isUsed) {
                result.push({
                    symbol,
                    scopeLevel: this.scopeLevel
                });
            }
        });
        
        // Recursively check child scopes
        for (const child of this.children) {
            result.push(...child.getUnusedSymbols());
        }
        
        return result;
    }
    
    // Get all uninitialized symbols in this scope and child scopes
    getUninitializedSymbols(): Array<{ symbol: SymbolTableEntry, scopeLevel: number }> {
        const result: Array<{ symbol: SymbolTableEntry, scopeLevel: number }> = [];
        
        // Check symbols in this scope
        this.symbols.forEach(symbol => {
            if (!symbol.isInitialized && symbol.isUsed) {
                result.push({
                    symbol,
                    scopeLevel: this.scopeLevel
                });
            }
        });
        
        // Recursively check child scopes
        for (const child of this.children) {
            result.push(...child.getUninitializedSymbols());
        }
        
        return result;
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
    private currentScope: SymbolTable; // Track current active scope
    private ast: ASTNode | null;
    private debugCallback?: (message: string) => void;
    private hints: { message: string; line: number; column: number }[];
    private scopeStack: SymbolTable[]; // Stack to track scope hierarchy

    constructor(tokens: Token[]) {
        this.tokens = tokens;
        this.currentTokenIndex = 0;
        this.errors = [];
        this.warnings = [];
        this.hints = [];
        this.symbolTable = new SymbolTable(); // Global scope
        this.currentScope = this.symbolTable;  // Start in global scope
        this.scopeStack = [this.symbolTable];  // Track scope stack
        this.ast = null;
    }

    // Helper methods for scope management
    private enterScope(): void {
        this.currentScope = this.currentScope.enterScope();
        this.scopeStack.push(this.currentScope);
        this.debug(`Entering new scope at level ${this.currentScope.getScopeLevel()}`);
    }

    private exitScope(): void {
        if (this.scopeStack.length <= 1) {
            this.debug("Cannot exit global scope");
            return;
        }
        
        this.scopeStack.pop();
        this.currentScope = this.scopeStack[this.scopeStack.length - 1];
        this.debug(`Exiting to scope at level ${this.currentScope.getScopeLevel()}`);
    }

    // Helper methods
    private getCurrentToken(): Token {
        if (this.currentTokenIndex >= this.tokens.length) {
            return new TokenImpl('EOF', null);
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

    private addHint(message: string, line: number, column: number) {
        this.hints.push({
            message,
            line,
            column
        });
    }

    // Semantic analysis methods
    analyzeProgram(): ASTNode | null {
        this.debug('Starting semantic analysis');
        const programNode: ASTNode = {
            type: 'Program',
            children: []
        };

        // Analyze the block
        const blockNode = this.analyzeBlock(false); // Parameter indicates if this is an if block
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

        // Check for unused variables
        this.checkUnusedVariables();

        this.ast = programNode;
        return programNode;
    }

    private analyzeBlock(isIfBlock: boolean = false): ASTNode | null {
        const blockNode: ASTNode = {
            type: 'Block',
            children: []
        };

        // Only create a new scope if this is not an if statement block
        if (!isIfBlock) {
            this.enterScope(); // Create a new scope for this block
        }

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

        // Only exit scope if we created a new one
        if (!isIfBlock) {
            this.exitScope(); // Return to parent scope
        }

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

        // Check if variable already exists in current scope only
        if (this.currentScope.lookupSymbolInCurrentScope(idToken.value!)) {
            this.addError(`Variable '${idToken.value}' already declared in this scope`, 
                idToken.line, 
                idToken.column);
        } else {
            // Add to symbol table in current scope
            this.currentScope.addSymbol(idToken.value!, typeToken.value!, 
                idToken.line, idToken.column);
            this.debug(`Added symbol '${idToken.value}' with type '${typeToken.value}' to scope level ${this.currentScope.getScopeLevel()}`);
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
        const symbol = this.currentScope.lookupSymbol(idToken.value!);
        
        if (!symbol) {
            this.addError(`Variable '${idToken.value}' not declared`, 
                idToken.line, 
                idToken.column);
            this.addHint(`Consider declaring the variable before using it: 'int ${idToken.value};'`, 
                idToken.line, 
                idToken.column);
        }

        this.advance();
        
        if (this.getCurrentToken().type !== 'ASSIGN') {
            this.addError("Expected '=' in assignment", 
                this.getCurrentToken().line, 
                this.getCurrentToken().column);
            this.addHint("Make sure to use a single '=' for assignment, not '==' which is for comparison", 
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
            // Handle boolean expressions and literals
            else if (expectedType === 'boolean' && (actualType === 'boolexpr' || actualType === 'boolval')) {
                // This is valid
            }
            // Handle direct type matches
            else if (expectedType === actualType) {
                // This is valid
            }
            else {
                this.addError(`Type mismatch: cannot assign ${actualType} to ${expectedType}`, 
                    idToken.line, 
                    idToken.column);
                this.addHint(`Consider converting the value to ${expectedType} or changing the variable type to ${actualType}`, 
                    idToken.line, 
                    idToken.column);
            }
        }

        // Mark as initialized
        if (symbol) {
            this.currentScope.markInitialized(idToken.value!);
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
                const symbol = this.currentScope.lookupSymbol(token.value!);
                if (!symbol) {
                    this.addError(`Variable '${token.value}' not declared`, 
                        token.line, 
                        token.column);
                } else if (!symbol.isInitialized) {
                    this.addWarning(`Variable '${token.value}' might not be initialized`, 
                        token.line, 
                        token.column);
                }
                // Mark the variable as used
                this.currentScope.markUsed(token.value!);
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

    private analyzeIntExpr(): ASTNode | null {
        const token = this.getCurrentToken();
        this.debug(`Analyzing integer expression starting with: ${token.type} [${token.value}]`);

        // First parse the left operand
        let leftExpr: ASTNode | null = null;

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
                this.addError(`Invalid type in arithmetic expression: expected int, got ${exprType}`, 
                    token.line, 
                    token.column);
                this.addHint(`Consider using integer values or variables in arithmetic expressions`, 
                    token.line, 
                    token.column);
                return null;
            }

            if (this.getCurrentToken().type !== 'RPAREN') {
                this.addError("Expected ')' after expression", 
                    this.getCurrentToken().line, 
                    this.getCurrentToken().column);
                this.addHint("Make sure to close all parentheses in arithmetic expressions", 
                    this.getCurrentToken().line, 
                    this.getCurrentToken().column);
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
                value: token.value!,
                children: []
            };
            this.advance();
        }
        // Handle identifier
        else if (token.type === 'ID') {
            const symbol = this.currentScope.lookupSymbol(token.value!);
            if (!symbol) {
                this.addError(`Undeclared variable: ${token.value}`, token.line, token.column);
                this.addHint(`Consider declaring the variable before using it: 'int ${token.value};'`, 
                    token.line, 
                    token.column);
                return null;
            }
            if (symbol.type !== 'int') {
                this.addError(`Invalid type in arithmetic expression: expected int, got ${symbol.type}`, 
                    token.line, 
                    token.column);
                this.addHint(`Consider using an integer variable or converting the value to int`, 
                    token.line, 
                    token.column);
                return null;
            }
            this.debug(`Found integer variable: ${token.value}`);
            leftExpr = {
                type: 'IntExpr',
                value: token.value!,
                children: []
            };
            this.advance();
        }
        else {
            this.addError("Expected integer expression", token.line, token.column);
            this.addHint("Arithmetic expressions can only contain integers, variables, and operators", 
                token.line, 
                token.column);
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
                this.addError(`Invalid type in arithmetic expression: expected int, got ${rightType}`, 
                    token.line, 
                    token.column);
                this.addHint(`Consider using integer values or variables in arithmetic expressions`, 
                    token.line, 
                    token.column);
                return null;
            }

            // Add optimization hint for common arithmetic patterns
            if (op === '+' && rightExpr.type === 'IntExpr' && rightExpr.value === '0') {
                this.addHint("Adding zero has no effect, consider simplifying the expression", 
                    token.line, 
                    token.column);
            }
            if (op === '*' && (rightExpr.type === 'IntExpr' && rightExpr.value === '1')) {
                this.addHint("Multiplying by one has no effect, consider simplifying the expression", 
                    token.line, 
                    token.column);
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

    private analyzeStringExpr(): ASTNode | null {
        const exprNode: ASTNode = {
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
                    value: this.getCurrentToken().value!,
                    children: []
                });
                this.advance();
            } else {
                this.addError("Invalid character in string", 
                    this.getCurrentToken().line, 
                    this.getCurrentToken().column);
                return null;
            }
        }

        if (this.getCurrentToken().type !== 'QUOTE') {
            this.addError("Unterminated string", 
                this.getCurrentToken().line, 
                this.getCurrentToken().column);
            return null;
        }

        this.advance(); // Skip closing quote
        return exprNode;
    }

    private analyzeBoolExpr(): ASTNode | null {
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
                this.addError("Expected boolean operator (== or !=)", 
                    this.getCurrentToken().line, 
                    this.getCurrentToken().column);
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
                this.addError(`Invalid type comparison: cannot compare ${leftType} with ${rightType}`, 
                    token.line, 
                    token.column);
            }

            // Check for closing parenthesis
            if (this.getCurrentToken().type !== 'RPAREN') {
                this.addError("Expected ')' after boolean expression", 
                    this.getCurrentToken().line, 
                    this.getCurrentToken().column);
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
                value: token.value!,
                children: []
            };
        }

        this.addError("Expected boolean expression", token.line, token.column);
        return null;
    }

    private getExpressionType(expr: ASTNode): string {
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
                const symbol = this.currentScope.lookupSymbol(expr.value!);
                return symbol ? symbol.type : 'unknown';
            default:
                return 'unknown';
        }
    }

    private areTypesComparable(type1: string, type2: string): boolean {
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

    private analyzePrint(): ASTNode | null {
        const printToken = this.getCurrentToken();
        this.advance();

        if (this.getCurrentToken().type !== 'LPAREN') {
            this.addError("Expected '(' after print", 
                this.getCurrentToken().line, 
                this.getCurrentToken().column);
            this.addHint("Print statements require parentheses around the expression: print(expression)", 
                this.getCurrentToken().line, 
                this.getCurrentToken().column);
            return null;
        }
        this.advance();

        const exprNode = this.analyzeExpression();
        if (!exprNode) {
            return null;
        }

        if (this.getCurrentToken().type !== 'RPAREN') {
            this.addError("Expected ')' after print expression", 
                this.getCurrentToken().line, 
                this.getCurrentToken().column);
            this.addHint("Make sure to close the print statement with a ')'", 
                this.getCurrentToken().line, 
                this.getCurrentToken().column);
            return null;
        }
        this.advance();

        return {
            type: 'Print',
            children: [exprNode]
        };
    }

    private analyzeIf(): ASTNode | null {
        this.debug(`Analyzing if statement at line ${this.getCurrentToken().line}`);
        this.advance(); // Skip 'if'

        // Parse the boolean expression
        const conditionNode = this.analyzeBoolExpr();
        if (!conditionNode) {
            this.debug("Failed to parse if condition");
            return null;
        }
        this.debug(`Successfully parsed if condition: ${conditionNode.type}`);

        // For if blocks, we want to create a new scope but inherit the parent's symbols
        this.enterScope();
        
        const blockNode = this.analyzeBlock(true); // true indicates this is an if block
        
        this.exitScope();
        
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

    private analyzeWhile(): ASTNode | null {
        const whileToken = this.getCurrentToken();
        this.advance();

        if (this.getCurrentToken().type !== 'LPAREN') {
            this.addError("Expected '(' after while", 
                this.getCurrentToken().line, 
                this.getCurrentToken().column);
            this.addHint("While loops require parentheses around the condition: while(condition)", 
                this.getCurrentToken().line, 
                this.getCurrentToken().column);
            return null;
        }
        this.advance();

        const conditionNode = this.analyzeBoolExpr();
        if (!conditionNode) {
            return null;
        }

        // Check for potential infinite loop
        if (conditionNode.type === 'boolval' && conditionNode.value === 'true') {
            this.addHint("This while loop will run indefinitely. Consider adding a condition that can become false", 
                whileToken.line, 
                whileToken.column);
        }

        if (this.getCurrentToken().type !== 'RPAREN') {
            this.addError("Expected ')' after while condition", 
                this.getCurrentToken().line, 
                this.getCurrentToken().column);
            this.addHint("Make sure to close the while condition with a ')'", 
                this.getCurrentToken().line, 
                this.getCurrentToken().column);
            return null;
        }
        this.advance();

        // Create a new scope for the while body
        this.enterScope();
        
        const bodyNode = this.analyzeBlock(true); // true means don't create another scope
        
        this.exitScope();
        
        if (!bodyNode) {
            return null;
        }

        return {
            type: 'While',
            children: [conditionNode, bodyNode]
        };
    }

    private expect(expectedType: string, errorMessage: string): boolean {
        const token = this.getCurrentToken();
        if (token.type === expectedType) {
            this.advance();
            return true;
        }
        this.addError(errorMessage, token.line, token.column);
        return false;
    }

    // Helper to visualize the AST
    public static visualizeAST(node: ASTNode, indent: string = ''): string {
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

    public enableDebug(callback: (message: string) => void): void {
        this.debugCallback = callback;
    }

    private debug(message: string): void {
        if (this.debugCallback) {
            this.debugCallback(message);
        }
    }

    getErrors(): string[] {
        return this.errors;
    }

    getWarnings(): string[] {
        return this.warnings;
    }

    getHints(): string[] {
        return this.hints.map(hint => `SEMANTIC --> Hint: ${hint.message} at line ${hint.line}:${hint.column}`);
    }

    getAST(): ASTNode | null {
        return this.ast;
    }

    public getSymbolTableData(): { name: string; type: string; initialized: boolean; isUsed: boolean; line: number; column: number; scopeLevel: number }[] {
        // Get all symbols with their scope levels
        const allSymbols = this.symbolTable.getAllSymbols();
        
        // Map to the expected format
        return allSymbols.map(({ symbol, scopeLevel }) => ({
            name: symbol.name,
            type: symbol.type,
            initialized: symbol.isInitialized,
            isUsed: symbol.isUsed,
            line: symbol.line,
            column: symbol.column,
            scopeLevel
        })).sort((a, b) => {
            // Sort by scope level (ascending) and then by name
            if (a.scopeLevel !== b.scopeLevel) {
                return a.scopeLevel - b.scopeLevel;
            }
            return a.name.localeCompare(b.name);
        });
    }

    public static visualizeSymbolTable(symbols: { name: string; type: string; initialized: boolean; isUsed: boolean; line: number; column: number; scopeLevel: number }[]): string {
        if (symbols.length === 0) {
            return "Symbol Table is empty";
        }

        // Group symbols by scope level
        const symbolsByScope: Record<number, typeof symbols> = {};
        symbols.forEach(symbol => {
            if (!symbolsByScope[symbol.scopeLevel]) {
                symbolsByScope[symbol.scopeLevel] = [];
            }
            symbolsByScope[symbol.scopeLevel].push(symbol);
        });

        // Get all scope levels and sort them
        const scopeLevels = Object.keys(symbolsByScope).map(Number).sort((a, b) => a - b);
        
        let output = "SYMBOL TABLE\n============\n\n";
        
        // Process each scope level
        scopeLevels.forEach(level => {
            const scopeSymbols = symbolsByScope[level].sort((a, b) => a.name.localeCompare(b.name));
            
            // Add scope header
            output += `Scope Level ${level}${level === 0 ? " (Global)" : ""}\n`;
            output += "─".repeat(60) + "\n";
            
            // Add table header
            output += "Symbol".padEnd(15) + "│ " + 
                     "Type".padEnd(10) + "│ " + 
                     "Init".padEnd(6) + "│ " + 
                     "Used".padEnd(6) + "│ " + 
                     "Location\n";
            
            output += "─".repeat(15) + "┼" + "─".repeat(11) + "┼" + 
                     "─".repeat(6) + "┼" + "─".repeat(6) + "┼" + "─".repeat(10) + "\n";
            
            // Add symbols for this scope
            scopeSymbols.forEach(symbol => {
                const initialized = symbol.initialized ? "Yes" : "No";
                const used = symbol.isUsed ? "Yes" : "No";
                
                output += symbol.name.padEnd(15) + "│ " + 
                         symbol.type.padEnd(10) + "│ " + 
                         initialized.padEnd(5) + "│ " + 
                         used.padEnd(5) + "│ " + 
                         `${symbol.line}:${symbol.column}\n`;
            });
            
            output += "\n\n";
        });
        
        return output;
    }

    // Check for unused variables
    private checkUnusedVariables(): void {
        const unusedSymbols = this.symbolTable.getUnusedSymbols();
        
        for (const { symbol, scopeLevel } of unusedSymbols) {
            this.addWarning(`Variable '${symbol.name}' is declared but never used`, 
                symbol.line, 
                symbol.column);
            this.addHint(`Consider removing the unused variable or using it in your code`, 
                symbol.line, 
                symbol.column);
        }
    }

    // Enhanced method to visualize the scope tree with better formatting
    public visualizeScopeTree(): string {
        const buildScopeTree = (scope: SymbolTable, indent: string = ""): string => {
            let result = `${indent}${indent === "" ? "" : "└─ "}Scope Level ${scope.getScopeLevel()}${scope.getScopeLevel() === 0 ? " (Global)" : ""}\n`;
            
            // Add divider line for this scope
            if (indent === "") {
                result += "═".repeat(60) + "\n";
            } else {
                result += `${indent}   ${"─".repeat(40)}\n`;
            }
            
            // Get symbols and sort them by name
            const symbols = Array.from(scope.getSymbols().entries())
                .sort((a, b) => a[0].localeCompare(b[0]));
            
            // Add symbols in this scope
            if (symbols.length > 0) {
                result += `${indent}   Symbols: ${symbols.length}\n`;
                
                symbols.forEach(([name, symbol]) => {
                    const initialized = symbol.isInitialized ? "Yes" : "No";
                    const used = symbol.isUsed ? "Yes" : "No";
                    
                    result += `${indent}   ├─ ${name.padEnd(15)} : ${symbol.type.padEnd(8)} [Init: ${initialized} | Used: ${used}] @${symbol.line}:${symbol.column}\n`;
                });
            } else {
                result += `${indent}   (No symbols in this scope)\n`;
            }
            
            // Add child scopes
            const childScopes = scope.getChildScopes();
            if (childScopes.length > 0) {
                result += `${indent}   Child Scopes: ${childScopes.length}\n`;
                
                childScopes.forEach((childScope, index) => {
                    const isLast = index === childScopes.length - 1;
                    const childIndent = indent + "   " + (isLast ? " " : "│");
                    
                    result += `${indent}   ${isLast ? "└" : "├"}── ${buildScopeTree(childScope, childIndent)}`;
                });
            }
            
            return result;
        };
        
        return buildScopeTree(this.symbolTable);
    }
    
    // Helper method to output current scope status
    public getCurrentScopeInfo(): string {
        const currentScopeLevel = this.currentScope.getScopeLevel();
        const symbolCount = this.currentScope.getSymbols().size;
        const parentScopeLevel = this.currentScope.getParentScope()?.getScopeLevel() ?? -1;
        
        return `Current Scope: Level ${currentScopeLevel}, ` +
               `Symbols: ${symbolCount}, ` +
               `Parent: ${parentScopeLevel >= 0 ? `Level ${parentScopeLevel}` : 'None'}, ` +
               `Scope Stack Depth: ${this.scopeStack.length}`;
    }
}

// Make classes available globally
(window as any).SemanticAnalyser = SemanticAnalyser;
(window as any).SymbolTable = SymbolTable;




