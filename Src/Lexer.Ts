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
    currentProgram: number;

    constructor(input: string) {
        this.input = input;
        this.position = 0;
        this.currentChar = this.input[0] || null;
        this.inComment = false;
        this.errors = [];
        this.programCount = 1;
        this.foundStartBrace = false;
        this.currentProgram = 1;
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
            return new Token(keywords[longestKeyword], longestKeyword);
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
        if (this.currentChar === '"') {
            this.advance(); // Move past the quote
            return new Token('QUOTE', '"');
        }
        
        // Handle the character
        const char = this.currentChar;
        this.advance();
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
    
    const programs = sourceCode.split('$').filter(prog => prog.trim().length > 0);
    let fullOutput = '';
    
    for (let i = 0; i < programs.length; i++) {
        const program = programs[i] + '$'; // Add back the $ that was removed in split
        const lexer = new Lexer(program);
        let token: Token;
        let programOutput = `<h3>Program ${i + 1}</h3><table><tr><th>Token Type</th><th>Value</th></tr>`;
        let warnings: string[] = [];
        let foundEOP = false;
        
        try {
            while ((token = lexer.getNextToken()).type !== 'EOF') {
                if (token.type === 'EOP') {
                    foundEOP = true;
                }
                programOutput += `<tr><td>${token.type}</td><td>${token.value}</td></tr>`;
            }
            
            programOutput += '</table>';
            
            // Add warnings for this program
            if (!foundEOP && i < programs.length - 1) {
                warnings.push(`Warning: Program ${i + 1} must end with "$"`);
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
            programOutput += `<div class='error'>Fatal error in Program ${i + 1}: ${error}</div>`;
        }
        
        fullOutput += programOutput;
    }
    
    outputDiv.innerHTML = fullOutput;
}






