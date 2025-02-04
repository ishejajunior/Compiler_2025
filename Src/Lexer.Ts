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
        if (!this.currentChar) {
            return new Token('ERROR', null);
        }

        // Look ahead to check for keywords first
        let potentialKeyword = '';
        let tempPos = this.position;
        let tempChar = this.currentChar;

        while (tempChar && /[a-z]/.test(tempChar)) {
            potentialKeyword += tempChar;
            tempPos++;
            tempChar = this.input[tempPos] || null;
        }

        const keywords: { [key: string]: string } = {
            'print': 'PRINT', 'while': 'WHILE', 'if': 'IF',
            'int': 'TYPE', 'string': 'TYPE', 'boolean': 'TYPE',
            'true': 'BOOLVAL', 'false': 'BOOLVAL'
        };

        // If it's a keyword, consume it entirely and return it
        if (keywords[potentialKeyword]) {
            // Move position to end of keyword
            for (let i = 0; i < potentialKeyword.length; i++) {
                this.advance();
            }
            return new Token(keywords[potentialKeyword], potentialKeyword);
        }

        // If not a keyword, just return the single character as ID
        const char = this.currentChar;
        this.advance();
        return new Token('ID', char);
    }

    number(): Token {
        // Instead of building a number string, just get one digit
        if (!this.currentChar) {
            return new Token('ERROR', null);
        }

        const digit = this.currentChar;
        this.advance();
        return new Token('DIGIT', digit);
    }

    string(): Token {
        // Handle one character at a time from a string
        this.advance(); // Skip the opening quote
        if (!this.currentChar || this.currentChar === '"') {
            this.advance(); // Skip the closing quote if present
            return new Token('ERROR', '');
        }

        const char = this.currentChar;
        this.advance();
        
        // Skip to the end of the string if there are more characters
        while (this.currentChar && this.currentChar !== '"') {
            this.advance();
        }
        if (this.currentChar === '"') {
            this.advance(); // Skip the closing quote
        }

        return new Token('CHAR', char);
    }
    
    getNextToken(): Token {
        while (this.currentChar) {
            if (this.currentChar === '/' && this.peek() === '*') {
                this.advance();
                this.advance();
                this.inComment = true;
                this.skipComment();
                continue;
            }
            if (this.inComment) {
                this.skipComment();
                continue;
            }
            if (/\s/.test(this.currentChar)) {
                this.skipWhitespace();
                continue;
            }
            if (this.currentChar === '$') {
                this.advance();
                return new Token('EOP', '$');
            }
            if (/[0-9]/.test(this.currentChar)) return this.number();
            if (/[a-z]/.test(this.currentChar)) return this.identifier();
            if (this.currentChar === '"') return this.string();

            const singleCharTokens: { [key: string]: string } = {
                '{': 'LBRACE', '}': 'RBRACE', '(': 'LPAREN', ')': 'RPAREN',
                '+': 'INTOP', '=': 'ASSIGN'
            };
            if (this.currentChar in singleCharTokens) {
                const token = new Token(singleCharTokens[this.currentChar], this.currentChar);
                this.advance();
                return token;
            }
            
            if (this.currentChar === '!') {
                this.advance();
                if (this.currentChar === '=') {
                    this.advance();
                    return new Token('BOOLOP', '!=');
                }
                this.error("Expected '=' after '!'");
                return new Token('ERROR', '!');
            }

            this.error(`Invalid character '${this.currentChar}'`);
        }
        return new Token('EOF', null);
    }
}

function compile(): void {
    const sourceCode = (document.getElementById('sourceCode') as HTMLTextAreaElement).value;
    const outputDiv = document.getElementById('output') as HTMLDivElement;
    outputDiv.innerHTML = '';
    
    const lexer = new Lexer(sourceCode);
    let token: Token;
    let output = `<h3>Program 1</h3><table><tr><th>Token Type</th><th>Value</th></tr>`;
    let warnings: string[] = [];
    let foundEOP = false;
    
    while ((token = lexer.getNextToken()).type !== 'EOF') {
        if (token.type === 'EOP') {
            foundEOP = true;
        }
        output += `<tr><td>${token.type}</td><td>${token.value}</td></tr>`;
    }
    
    output += '</table>';
    if (!foundEOP) warnings.push('Warning: Program must end with "$"');
    if (warnings.length > 0) output += warnings.map(w => `<div class='warning'>${w}</div>`).join('');
    if (lexer.errors.length > 0) output += lexer.errors.map(e => `<div class='error'>${e}</div>`).join('');
    
    outputDiv.innerHTML = output;
}






