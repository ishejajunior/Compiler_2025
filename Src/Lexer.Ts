// Token class
class Token {
    type: string;
    value: string | null;
    line: number;
    column: number;

    // Constructor for the Token class
    constructor(type: string, value: string | null) {
        this.type = type;
        this.value = value;
        this.line = 0;
        this.column = 0;
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
    currentProgram: number;
    line: number;
    column: number;

    constructor(input: string) {
        this.input = input;
        this.position = 0;
        this.currentChar = this.input[0] || null;
        this.inComment = false;
        this.errors = [];
        this.programCount = 1;
        this.foundStartBrace = false;
        this.currentProgram = 1;
        this.line = 1;
        this.column = 1;
    }
    error(message: string): void {
        this.errors.push(`LEXER --> | Error: ${message} on line ${this.line}:${this.column}`);
        this.advance();
    }

    advance(): void {
        if (this.currentChar === '\n') {
            this.line++;
            this.column = 0;
        }
        this.position++;
        this.column++;
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
        let tempPos = this.position;
        let tempChar = this.currentChar;
        let longestKeyword = '';

        const keywords: { [key: string]: string } = {
            'print': 'PRINT', 'while': 'WHILE', 'if': 'IF',
            'int': 'TYPE', 'string': 'TYPE', 'boolean': 'TYPE',
            'true': 'BOOLVAL', 'false': 'BOOLVAL'
        };

        // Build potential keyword and check at each step
        let potentialKeyword = '';
        while (tempChar && /[a-z]/.test(tempChar)) {
            potentialKeyword += tempChar;
            if (keywords[potentialKeyword]) {
                longestKeyword = potentialKeyword;
            }
            tempPos++;
            tempChar = this.input[tempPos] || null;
        }

        // If we found a keyword
        if (longestKeyword) {
            // Advance past the keyword
            for (let i = 0; i < longestKeyword.length; i++) {
                this.advance();
            }
            const token = new Token(keywords[longestKeyword], longestKeyword);
            token.line = this.line;
            token.column = this.column - (longestKeyword.length || 0);
            return token;
        }

        // If not a keyword, just return the single character as ID
        const char = this.currentChar;
        this.advance();
        const token = new Token('ID', char);
        token.line = this.line;
        token.column = this.column - 1;
        return token;
    }

    number(): Token {
        // Instead of building a number string, just get one digit
        if (!this.currentChar) {
            return new Token('ERROR', null);
        }

        const digit = this.currentChar;
        this.advance();
        const token = new Token('DIGIT', digit);
        token.line = this.line;
        token.column = this.column - 1;
        return token;
    }

    string(): Token {
        if (this.currentChar === '"') {
            this.advance(); // Move past the quote
            const token = new Token('QUOTE', '"');
            token.line = this.line;
            token.column = this.column - 1;
            return token;
        }
        
        // Handle the character
        const char = this.currentChar;
        this.advance();
        const token = new Token('CHAR', char);
        token.line = this.line;
        token.column = this.column - 1;
        return token;
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
                const token = new Token('EOP', '$');
                token.line = this.line;
                token.column = this.column - 1;
                return token;
            }
            if (/[0-9]/.test(this.currentChar)) return this.number();
            if (/[a-z]/.test(this.currentChar)) return this.identifier();
            
            // Modified string handling
            if (this.currentChar === '"' || 
                (this.position > 0 && 
                 this.input[this.position - 1] === '"' && 
                 !this.input.slice(this.position, this.position + 1).includes('"'))) {
                return this.string();
            }

            const singleCharTokens: { [key: string]: string } = {
                '{': 'LBRACE', '}': 'RBRACE', '(': 'LPAREN', ')': 'RPAREN',
                '+': 'INTOP', '=': 'ASSIGN'
            };
            if (this.currentChar in singleCharTokens) {
                const token = new Token(singleCharTokens[this.currentChar], this.currentChar);
                this.advance();
                token.line = this.line;
                token.column = this.column - 1;
                return token;
            }
            
            if (this.currentChar === '!') {
                this.advance();
                if (this.currentChar === '=') {
                    this.advance();
                    const token = new Token('BOOLOP', '!=');
                    token.line = this.line;
                    token.column = this.column - 2;
                    return token;
                }
                this.error("Expected '=' after '!'");
                const token = new Token('ERROR', '!');
                token.line = this.line;
                token.column = this.column - 1;
                return token;
            }

            this.error(`Invalid character '${this.currentChar}'`);
        }
        const token = new Token('EOF', null);
        token.line = this.line;
        token.column = this.column;
        return token;
    }

    // Helper method to format token output
    formatToken(type: string, value: string | null): string {
        const displayValue = value === null ? '' : value;
        return `LEXER --> | ${type} [ ${displayValue} ] on line ${this.line}:${this.column - (displayValue.length || 0)}`;
    }
}

function compile(): void {
    const sourceCode = (document.getElementById('sourceCode') as HTMLTextAreaElement).value;
    const outputDiv = document.getElementById('output') as HTMLDivElement;
    outputDiv.innerHTML = '';
    
    const programs = sourceCode.split('$').filter(prog => prog.trim().length > 0);
    let fullOutput = '';
    
    for (let i = 0; i < programs.length; i++) {
        const program = programs[i] + '$';
        const lexer = new Lexer(program);
        let token: Token;
        let programOutput = `<h3>Program ${i + 1}</h3>`;
        let warnings: string[] = [];
        let foundEOP = false;
        
        try {
            while ((token = lexer.getNextToken()).type !== 'EOF') {
                if (token.type === 'EOP') {
                    foundEOP = true;
                }
                // Format each token with line and column info
                programOutput += `<div>${lexer.formatToken(token.type, token.value)}</div>`;
            }
            
            // Add warnings for this program
            if (!foundEOP && i < programs.length - 1) {
                warnings.push(`LEXER --> | Warning: Program ${i + 1} must end with "$" on line ${lexer.line}:${lexer.column}`);
            }
            
            // Add any lexer errors for this program
            if (lexer.errors.length > 0) {
                programOutput += lexer.errors.map(e => `<div class='error'>${e}</div>`).join('');
            }
            
            // Add any warnings for this program
            if (warnings.length > 0) {
                programOutput += warnings.map(w => `<div class='warning'>${w}</div>`).join('');
            }
            
        } catch (error) {
            programOutput += `<div class='error'>LEXER --> | Fatal error in Program ${i + 1} on line ${lexer.line}:${lexer.column}: ${error}</div>`;
        }
        
        fullOutput += programOutput;
    }
    
    outputDiv.innerHTML = fullOutput;
}






