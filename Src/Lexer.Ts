// Token class
class Token {
    type: string;
    value: string | null;

    // Constructor for the Token class
    constructor(type: string, value: string | null) {
        this.type = type;
        this.value = value;
    }
}

// Lexer class
class Lexer {
    input: string;
    position: number;
    currentChar: string | null;
    inComment: boolean;
    errors: string[];
    programCount: number;
    foundStartBrace: boolean;

    constructor(input: string) {
        this.input = input;
        this.position = 0;
        this.currentChar = this.input[0] || null;
        this.inComment = false;
        this.errors = [];
        this.programCount = 1;
        this.foundStartBrace = false;
    }
    error(message: string): void {
        this.errors.push(`Error at position ${this.position}: ${message}`);
        this.advance();
    }

    advance(): void {
        this.position++;
        this.currentChar = this.input[this.position] || null;
    }

    peek(): string | null {
        return this.position + 1 > this.input.length - 1 ? null : this.input[this.position + 1];
    }

    skipWhitespace(): void {
        while (this.currentChar && /\s/.test(this.currentChar)) {
            this.advance();
        }
    }

    skipComment(): void {
        while (this.currentChar) {
            if (this.currentChar === '*' && this.peek() === '/') {
                this.advance();
                this.advance();
                this.inComment = false;
                break;
            }
            this.advance();
        }
    }
    
    identifier(): Token {
        let result = '';

        while (this.currentChar && /[a-z]/.test(this.currentChar)) {
            result += this.currentChar;
            this.advance();
        }

        const keywords: { [key: string]: string } = {
            'print': 'PRINT', 'while': 'WHILE', 'if': 'IF',
            'int': 'TYPE', 'string': 'TYPE', 'boolean': 'TYPE',
            'true': 'BOOLVAL', 'false': 'BOOLVAL'
        };
        
        return new Token(keywords[result] || 'ID', result);
    }

    number(): Token {
        let result = '';

        while (this.currentChar && /[0-9]/.test(this.currentChar)) {
            result += this.currentChar;
            this.advance();
        }

        return new Token('DIGIT', result);
    }

    string(): Token {
        let result = '';
        this.advance();
        while (this.currentChar && this.currentChar !== '"') {
            result += this.currentChar;
            this.advance();
        }
        if (this.currentChar === '"') {
            this.advance();
            return new Token('STRING', result);
        }
        this.error('Unterminated string literal');
        return new Token('ERROR', '');
    }
    


}






