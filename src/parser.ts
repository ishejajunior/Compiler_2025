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

    private parseExpr(): TreeNode | null {
        this.debug('Expression');
        const token = this.getCurrentToken();
        this.debug(`Current token: ${token.type} [${token.value}]`);
        
        if (token.type === 'DIGIT') {
            this.debug('Found DIGIT (IntExpr)');
            return this.parseIntExpr();
        }
        if (token.type === 'QUOTE') {
            this.debug('Found QUOTE (StringExpr)');
            return this.parseStringExpr();
        }
        if (token.type === 'LPAREN' || token.type === 'BOOLVAL') {
            this.debug('Found LPAREN or BOOLVAL (BooleanExpr)');
            return this.parseBooleanExpr();
        }
        if (token.type === 'ID') {
            this.debug('Found ID');
            this.advance();
            this.debug('ID parsed successfully');
            return new TreeNode('Id', token.value || '');
        }
        
        this.debug('No valid expression found');
        return null;
    }

    private parseIntExpr(): TreeNode | null {
        const intExprNode = new TreeNode('IntExpr');
        
        // Get the digit
        const digitToken = this.getCurrentToken();
        this.advance();
        intExprNode.addChild(new TreeNode('Digit', digitToken.value || ''));
        
        // Check for intop
        if (this.getCurrentToken().type === 'INTOP') {
            this.advance();
            const exprNode = this.parseExpr();
            if (!exprNode) return null;
            intExprNode.addChild(exprNode);
        }
        
        return intExprNode;
    }

    private parseStringExpr(): TreeNode | null {
        const stringExprNode = new TreeNode('StringExpr');
        
        this.advance(); // consume opening quote
        while (this.getCurrentToken().type === 'CHAR' || this.getCurrentToken().type === 'SPACE') {
            stringExprNode.addChild(new TreeNode('Char', this.getCurrentToken().value || ''));
            this.advance();
        }
        
        if (!this.expect('QUOTE', "Expected closing quote")) return null;
        return stringExprNode;
    }

    private parseBooleanExpr(): TreeNode | null {
        const boolExprNode = new TreeNode('BooleanExpr');
        
        if (this.getCurrentToken().type === 'BOOLVAL') {
            boolExprNode.addChild(new TreeNode('BoolVal', this.getCurrentToken().value || ''));
            this.advance();
            return boolExprNode;
        }
        
        if (!this.expect('LPAREN', "Expected '(' in boolean expression")) return null;
        const expr1 = this.parseExpr();
        if (!expr1) return null;
        boolExprNode.addChild(expr1);
        
        if (!this.match('BOOLOP')) {
            this.addError("Expected boolean operator");
            return null;
        }
        boolExprNode.addChild(new TreeNode('BoolOp', this.tokens[this.currentTokenIndex - 1].value || ''));
        
        const expr2 = this.parseExpr();
        if (!expr2) return null;
        boolExprNode.addChild(expr2);
        
        if (!this.expect('RPAREN', "Expected ')'")) return null;
        return boolExprNode;
    }

    getErrors(): string[] {
        return this.errors;
    }

    getCst(): TreeNode | null {
        return this.cst;
    }

    // Helper to visualize the CST
    public static visualizeTree(node: TreeNode, indent: string = ''): string {
        const nodeColor = '#FFA500'; // Orange for node names
        const valueColor = '#6A8759'; // Green for values
        const indentColor = '#606366'; // Grey for indent lines

        let result = `<span style="color: ${indentColor}">${indent}</span>`;
        result += `<span style="color: ${nodeColor}">${node.name}</span>`;
        
        if (node.value) {
            result += `<span style="color: ${valueColor}"> [${node.value}]</span>`;
        }
        result += '\n';

        for (const child of node.children) {
            result += Parser.visualizeTree(child, indent + '  ');
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
}

function compile(): void {
    const sourceCode = (document.getElementById('sourceCode') as HTMLTextAreaElement).value;
    const outputDiv = document.getElementById('output') as HTMLDivElement;
    outputDiv.innerHTML = '';
    
    // Split source code into programs by '$'
    const programs = sourceCode.split('$').filter(prog => prog.trim().length > 0);
    let fullOutput = '';
    
    for (let i = 0; i < programs.length; i++) {
        const programNum = i + 1;
        fullOutput += `<h3>Program ${programNum}</h3>`;
        fullOutput += `<h4>Lexical Analysis</h4>`;
        
        // Lexical Analysis
        const lexer = new Lexer(programs[i] + '$');
        let tokens: Token[] = [];
        
        try {
            let token: Token;
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
                fullOutput += parser.getErrors().map(error => 
                    `<div style="color: red; font-weight: bold;">${error}</div>`
                ).join('');
                fullOutput += `<div style="color: red; font-weight: bold;">Parsing failed</div>`;
            } else if (cst) {
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
            }

        } catch (error) {
            fullOutput += `<div style="color: red; font-weight: bold;">Compiler Error in Program ${programNum}: ${error}</div>`;
        }
        
        fullOutput += '<hr>';
    }
    
    outputDiv.innerHTML = fullOutput;
}
