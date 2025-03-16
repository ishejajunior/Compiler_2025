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
