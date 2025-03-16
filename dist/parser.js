// Node class for the CST
class TreeNode {
    constructor(name, value) {
        this.name = name;
        this.children = [];
        this.value = value;
    }
    addChild(node) {
        this.children.push(node);
    }
}
class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.currentTokenIndex = 0;
        this.errors = [];
        this.warnings = [];
        this.cst = null;
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
    addError(message) {
        const token = this.getCurrentToken();
        let position = 'end of file';
        // Get the position from the current token or the previous token if more appropriate
        if (token && token.type !== 'EOF') {
            position = `line ${token.line}:${token.column}`;
        }
        else if (this.currentTokenIndex > 0 && this.tokens.length > 0) {
            // If we're at EOF, use the last token's position
            const lastToken = this.tokens[this.currentTokenIndex - 1];
            position = `line ${lastToken.line}:${lastToken.column}`;
        }
        this.errors.push(`PARSER --> Error: ${message} at ${position}`);
        this.debug(`ERROR: ${message} at ${position}`);
    }
    match(expectedType) {
        const token = this.getCurrentToken();
        if (token && token.type === expectedType) {
            this.advance();
            return true;
        }
        return false;
    }
    expect(expectedType, errorMessage) {
        if (this.match(expectedType)) {
            return true;
        }
        this.addError(errorMessage);
        return false;
    }
    // Parsing methods following the grammar
    parseProgram() {
        this.debug('Program');
        const programNode = new TreeNode('Program');
        // Program ::== Block $
        this.debug('Attempting to parse Block');
        const blockNode = this.parseBlock();
        if (blockNode) {
            programNode.addChild(blockNode);
            this.debug('Block parsed successfully');
            this.debug('Expecting EOP ($)');
            if (!this.match('EOP')) {
                this.addWarning("Program ended without end of program symbol '$'");
                // Don't return null, just add warning
            }
            this.debug('Found EOP');
            this.cst = programNode;
            this.debug('Program parsed successfully');
            return programNode;
        }
        this.debug('Failed to parse Program');
        return null;
    }
    parseBlock() {
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
        }
        else {
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
    parseStatementList() {
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
    parseStatement() {
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
    parsePrintStatement() {
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
    parseVarDecl() {
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
    parseAssignmentStatement() {
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
    parseWhileStatement() {
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
        if (!blockNode)
            return null;
        whileNode.addChild(blockNode);
        return whileNode;
    }
    parseIfStatement() {
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
        if (!blockNode)
            return null;
        ifNode.addChild(blockNode);
        return ifNode;
    }
    parseExpr() {
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
    parseIntExpr() {
        const intExprNode = new TreeNode('IntExpr');
        // Get the digit
        const digitToken = this.getCurrentToken();
        this.advance();
        intExprNode.addChild(new TreeNode('Digit', digitToken.value || ''));
        // Check for intop
        if (this.getCurrentToken().type === 'INTOP') {
            this.advance();
            const exprNode = this.parseExpr();
            if (!exprNode)
                return null;
            intExprNode.addChild(exprNode);
        }
        return intExprNode;
    }
    parseStringExpr() {
        const stringExprNode = new TreeNode('StringExpr');
        this.advance(); // consume opening quote
        while (this.getCurrentToken().type === 'CHAR' || this.getCurrentToken().type === 'SPACE') {
            stringExprNode.addChild(new TreeNode('Char', this.getCurrentToken().value || ''));
            this.advance();
        }
        if (!this.expect('QUOTE', "Expected closing quote"))
            return null;
        return stringExprNode;
    }
    parseBooleanExpr() {
        const boolExprNode = new TreeNode('BooleanExpr');
        if (this.getCurrentToken().type === 'BOOLVAL') {
            boolExprNode.addChild(new TreeNode('BoolVal', this.getCurrentToken().value || ''));
            this.advance();
            return boolExprNode;
        }
        if (!this.expect('LPAREN', "Expected '(' in boolean expression"))
            return null;
        const expr1 = this.parseExpr();
        if (!expr1)
            return null;
        boolExprNode.addChild(expr1);
        if (!this.match('BOOLOP')) {
            this.addError("Expected boolean operator");
            return null;
        }
        boolExprNode.addChild(new TreeNode('BoolOp', this.tokens[this.currentTokenIndex - 1].value || ''));
        const expr2 = this.parseExpr();
        if (!expr2)
            return null;
        boolExprNode.addChild(expr2);
        if (!this.expect('RPAREN', "Expected ')'"))
            return null;
        return boolExprNode;
    }
    getErrors() {
        return this.errors;
    }
    getWarnings() {
        return this.warnings;
    }
    getCst() {
        return this.cst;
    }
    // Helper to visualize the CST
    static visualizeTree(node, indent = '') {
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
    enableDebug(callback) {
        this.debugCallback = callback;
    }
    debug(message) {
        if (this.debugCallback) {
            this.debugCallback(message);
        }
    }
    addWarning(message) {
        const token = this.getCurrentToken();
        const position = token ? `line ${token.line}:${token.column}` : 'end of file';
        this.warnings.push(`PARSER --> Warning: ${message} at ${position}`);
        this.debug(`WARNING: ${message} at ${position}`);
    }
}
function compile() {
    const sourceCode = document.getElementById('sourceCode').value;
    const outputDiv = document.getElementById('output');
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
            // Display any warnings first
            if (parser.getWarnings().length > 0) {
                fullOutput += parser.getWarnings().map(warning => `<div style="color: #FFB100; font-weight: bold;">${warning}</div>`).join('');
            }
            if (parser.getErrors().length > 0) {
                // Display parsing errors
                fullOutput += parser.getErrors().map(error => `<div style="color: red; font-weight: bold;">${error}</div>`).join('');
                fullOutput += `<div style="color: red; font-weight: bold;">Parsing failed</div>`;
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
            }
        }
        catch (error) {
            fullOutput += `<div style="color: red; font-weight: bold;">Compiler Error in Program ${programNum}: ${error}</div>`;
        }
        fullOutput += '<hr>';
    }
    outputDiv.innerHTML = fullOutput;
}
//# sourceMappingURL=parser.js.map