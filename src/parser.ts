// Node class for the CST
class TreeNode {
    name: string;
    children: TreeNode[];
    value?: string;

    constructor(name: string, value?: string) {
        this.name = name;
        this.children = [];
        this.value = value;
    }

    addChild(node: TreeNode): void {
        this.children.push(node);
    }
}

class Parser {
    private tokens: Token[];
    private currentTokenIndex: number;
    private errors: string[];
    private warnings: string[];
    private cst: TreeNode | null;
    private debugCallback?: (message: string) => void;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
        this.currentTokenIndex = 0;
        this.errors = [];
        this.warnings = [];
        this.cst = null;
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

    private addError(message: string): void {
        const token = this.getCurrentToken();
        let position = 'end of file';
        
        // Get the position from the current token or the previous token if more appropriate
        if (token && token.type !== 'EOF') {
            position = `line ${token.line}:${token.column}`;
        } else if (this.currentTokenIndex > 0 && this.tokens.length > 0) {
            // If we're at EOF, use the last token's position
            const lastToken = this.tokens[this.currentTokenIndex - 1];
            position = `line ${lastToken.line}:${lastToken.column}`;
        }
        
        this.errors.push(`PARSER --> Error: ${message} at ${position}`);
        this.debug(`ERROR: ${message} at ${position}`);
    }

    private match(expectedType: string): boolean {
        const token = this.getCurrentToken();
        if (token && token.type === expectedType) {
            this.advance();
            return true;
        }
        return false;
    }

    private expect(expectedType: string, errorMessage: string): boolean {
        if (this.match(expectedType)) {
            return true;
        }
        this.addError(errorMessage);
        return false;
    }

    // Parsing methods following the grammar
    parseProgram(): TreeNode | null {
        this.debug('Program');
        const programNode = new TreeNode('Program');
        
        // Program ::== Block $
        this.debug('Attempting to parse Block');
        const blockNode = this.parseBlock();
        if (blockNode) {
            programNode.addChild(blockNode);
            this.debug('Block parsed successfully');
            
            this.debug('Expecting EOP ($)');
            if (!this.expect('EOP', "Expected end of program symbol '$'")) {
                this.debug('Failed to find EOP');
                return null;
            }
            this.debug('Found EOP');
            
            this.cst = programNode;
            this.debug('Program parsed successfully');
            return programNode;
        }
        
        this.debug('Failed to parse Program');
        return null;
    }

    private parseBlock(): TreeNode | null {
        this.debug('Block');
        const blockNode = new TreeNode('Block');
        
        // Block ::== { StatementList }
        this.debug('Expecting LBRACE ({)');
        if (!this.expect('LBRACE', "Expected '{'")) {
            this.debug('Failed to find LBRACE');
            return null;
        }
        this.debug('Found LBRACE');

        this.debug('Attempting to parse StatementList');
        const stmtListNode = this.parseStatementList();
        if (stmtListNode) {
            blockNode.addChild(stmtListNode);
            this.debug('StatementList parsed successfully');
        } else {
            this.debug('Empty StatementList');
        }

        this.debug('Expecting RBRACE (})');
        if (!this.expect('RBRACE', "Expected '}'")) {
            this.debug('Failed to find RBRACE');
            return null;
        }
        this.debug('Found RBRACE');
        this.debug('Block parsed successfully');

        return blockNode;
    }

    private parseStatementList(): TreeNode | null {
        this.debug('StatementList');
        const stmtListNode = new TreeNode('StatementList');
        
        // Try to parse a statement
        this.debug('Attempting to parse Statement');
        const stmtNode = this.parseStatement();
        if (stmtNode) {
            stmtListNode.addChild(stmtNode);
            this.debug('Statement parsed successfully');
            
            // Recursively parse the rest of the statement list
            this.debug('Recursively parsing StatementList');
            const restStmtList = this.parseStatementList();
            if (restStmtList) {
                stmtListNode.addChild(restStmtList);
                this.debug('Recursive StatementList parsed successfully');
            }
            return stmtListNode;
        }
        
        // Empty statement list is valid (ε production)
        this.debug('No more statements found (ε production)');
        return stmtListNode;
    }

    private parseStatement(): TreeNode | null {
        this.debug('Statement');
        const token = this.getCurrentToken();
        this.debug(`Current token: ${token.type} [${token.value}]`);
        
        switch (token.type) {
            case 'PRINT':
                this.debug('Found PRINT statement');
                return this.parsePrintStatement();
            case 'TYPE':
                this.debug('Found TYPE declaration');
                return this.parseVarDecl();
            case 'ID':
                this.debug('Found ID (assignment)');
                return this.parseAssignmentStatement();
            case 'WHILE':
                this.debug('Found WHILE statement');
                return this.parseWhileStatement();
            case 'IF':
                this.debug('Found IF statement');
                return this.parseIfStatement();
            case 'LBRACE':
                this.debug('Found nested block');
                return this.parseBlock();
            default:
                this.debug('No valid statement found');
                return null;
        }
    }

    private parsePrintStatement(): TreeNode | null {
        this.debug('PrintStatement');
        const printNode = new TreeNode('PrintStatement');
        
        // print ( Expr )
        this.advance(); // consume 'print'
        this.debug('Expecting LPAREN');
        if (!this.expect('LPAREN', "Expected '(' after 'print'")) {
            this.debug('Failed to find LPAREN');
            return null;
        }
        this.debug('Found LPAREN');
        
        this.debug('Attempting to parse expression');
        const exprNode = this.parseExpr();
        if (!exprNode) {
            this.debug('Failed to parse expression');
            this.addError("Expected expression in print statement");
            return null;
        }
        this.debug('Expression parsed successfully');
        printNode.addChild(exprNode);
        
        this.debug('Expecting RPAREN');
        if (!this.expect('RPAREN', "Expected ')' after expression")) {
            this.debug('Failed to find RPAREN');
            return null;
        }
        this.debug('Found RPAREN');
        this.debug('PrintStatement parsed successfully');
        
        return printNode;
    }

    private parseVarDecl(): TreeNode | null {
        this.debug('VarDecl');
        const varDeclNode = new TreeNode('VarDecl');
        
        // type Id
        const typeToken = this.getCurrentToken();
        this.advance(); // consume type
        varDeclNode.addChild(new TreeNode('Type', typeToken.value || ''));
        
        // Check if the next token is an ID
        if (this.getCurrentToken().type !== 'ID') {
            this.addError(`Expected identifier after type '${typeToken.value}'`);
            return null;
        }
        
        // Consume the ID
        const idToken = this.getCurrentToken();
        this.advance();
        varDeclNode.addChild(new TreeNode('Id', idToken.value || ''));
        
        return varDeclNode;
    }

    private parseAssignmentStatement(): TreeNode | null {
        this.debug('AssignmentStatement');
        const assignNode = new TreeNode('AssignmentStatement');
        
        // Id = Expr
        if (this.getCurrentToken().type !== 'ID') {
            this.addError("Expected identifier at start of assignment");
            return null;
        }
        
        const idToken = this.getCurrentToken();
        this.advance(); // consume ID
        assignNode.addChild(new TreeNode('Id', idToken.value || ''));
        
        if (this.getCurrentToken().type !== 'ASSIGN') {
            this.addError(`Expected '=' after identifier '${idToken.value}'`);
            return null;
        }
        this.advance(); // consume =
        
        const exprNode = this.parseExpr();
        if (!exprNode) {
            this.addError(`Expected expression after '=' in assignment to '${idToken.value}'`);
            return null;
        }
        assignNode.addChild(exprNode);
        
        return assignNode;
    }

    private parseWhileStatement(): TreeNode | null {
        const whileNode = new TreeNode('WhileStatement');
        
        // while BooleanExpr Block
        this.advance(); // consume 'while'
        const boolExprNode = this.parseBooleanExpr();
        if (!boolExprNode) {
            this.addError("Expected boolean expression after 'while'");
            return null;
        }
        whileNode.addChild(boolExprNode);
        
        const blockNode = this.parseBlock();
        if (!blockNode) return null;
        whileNode.addChild(blockNode);
        
        return whileNode;
    }

    private parseIfStatement(): TreeNode | null {
        const ifNode = new TreeNode('IfStatement');
        
        // if BooleanExpr Block
        this.advance(); // consume 'if'
        const boolExprNode = this.parseBooleanExpr();
        if (!boolExprNode) {
            this.addError("Expected boolean expression after 'if'");
            return null;
        }
        ifNode.addChild(boolExprNode);
        
        const blockNode = this.parseBlock();
        if (!blockNode) return null;
        ifNode.addChild(blockNode);
        
        return ifNode;
    }

    