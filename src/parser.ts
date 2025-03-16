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

    