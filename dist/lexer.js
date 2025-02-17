// Token class
class Token {
    // Constructor for the Token class
    constructor(type, value) {
        this.type = type;
        this.value = value;
        this.line = 0;
        this.column = 0;
    }
}
// Lexer class
class Lexer {
    constructor(input) {
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
        this.inString = false;
    }
    error(message) {
        this.errors.push(`LEXER --> | Error: ${message} on line ${this.line}:${this.column}`);
        this.advance();
    }
    advance() {
        if (this.currentChar === '\n') {
            this.line++;
            this.column = 0;
        }
        this.position++;
        this.column++;
        this.currentChar = this.input[this.position] || null;
    }
    peek() {
        return this.position + 1 > this.input.length - 1 ? null : this.input[this.position + 1];
    }
    skipWhitespace() {
        while (this.currentChar && /\s/.test(this.currentChar)) {
            this.advance();
        }
    }
    skipComment() {
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
    identifier() {
        if (!this.currentChar) {
            return new Token('ERROR', null);
        }
        // Look ahead to check for keywords first
        let tempPos = this.position;
        let tempChar = this.currentChar;
        let longestKeyword = '';
        const keywords = {
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
    number() {
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
    string() {
        if (this.currentChar === '"') {
            this.advance(); // Move past the opening quote
            const token = new Token('QUOTE', '"');
            token.line = this.line;
            token.column = this.column - 1;
            return token;
        }
        // Handle each character within the string, including spaces
        if (!this.currentChar) {
            return new Token('ERROR', null);
        }
        const char = this.currentChar;
        this.advance();
        const token = new Token('CHAR', char);
        token.line = this.line;
        token.column = this.column - 1;
        return token;
    }
    getNextToken() {
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
            if (this.inString || this.currentChar === '"') {
                if (this.currentChar === '"') {
                    if (!this.inString) {
                        this.inString = true;
                    }
                    else {
                        this.inString = false;
                    }
                }
                return this.string();
            }
            if (!this.inString && /\s/.test(this.currentChar)) {
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
            if (/[0-9]/.test(this.currentChar))
                return this.number();
            if (/[a-z]/.test(this.currentChar))
                return this.identifier();
            const singleCharTokens = {
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
            // Add support for == operator
            if (this.currentChar === '=') {
                this.advance();
                if (this.currentChar === '=') {
                    this.advance();
                    const token = new Token('BOOLOP', '==');
                    token.line = this.line;
                    token.column = this.column - 2;
                    return token;
                }
                // Single = is an assignment operator
                const token = new Token('ASSIGN', '=');
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
    formatToken(type, value) {
        const displayValue = value === null ? '' : value;
        const isError = type === 'ERROR';
        const style = isError ? 'color: red;' : '';
        return `<span style="${style}">LEXER --> | ${type} [ ${displayValue} ] on line ${this.line}:${this.column - (displayValue.length || 0)}</span>`;
    }
}
function compile() {
    const sourceCode = document.getElementById('sourceCode').value;
    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = '';
    const programs = sourceCode.split('$').filter(prog => prog.trim().length > 0);
    let fullOutput = '';
    for (let i = 0; i < programs.length; i++) {
        const program = programs[i] + '$';
        const lexer = new Lexer(program);
        let token;
        let programOutput = `<h3>Program ${i + 1}</h3>`;
        let warnings = [];
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
                programOutput += lexer.errors.map(e => `<div style="color: red;">${e}</div>`).join('');
            }
            // Add any warnings for this program
            if (warnings.length > 0) {
                programOutput += warnings.map(w => `<div class='warning'>${w}</div>`).join('');
            }
        }
        catch (error) {
            programOutput += `<div class='error'>LEXER --> | Fatal error in Program ${i + 1} on line ${lexer.line}:${lexer.column}: ${error}</div>`;
        }
        fullOutput += programOutput;
    }
    outputDiv.innerHTML = fullOutput;
}
//# sourceMappingURL=lexer.js.map