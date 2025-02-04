// Token class
class Token {
    // Constructor for the Token class
    constructor(type, value) {
        this.type = type;
        this.value = value;
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
    }
    error(message) {
        this.errors.push(`Error at position ${this.position}: ${message}`);
        this.advance();
    }
    advance() {
        this.position++;
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
            return new Token(keywords[longestKeyword], longestKeyword);
        }
        // If not a keyword, just return the single character as ID
        const char = this.currentChar;
        this.advance();
        return new Token('ID', char);
    }
    number() {
        // Instead of building a number string, just get one digit
        if (!this.currentChar) {
            return new Token('ERROR', null);
        }
        const digit = this.currentChar;
        this.advance();
        return new Token('DIGIT', digit);
    }
    string() {
        if (this.currentChar === '"') {
            this.advance(); // Move past the quote
            return new Token('QUOTE', '"');
        }
        // Handle the character
        const char = this.currentChar;
        this.advance();
        return new Token('CHAR', char);
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
            if (/\s/.test(this.currentChar)) {
                this.skipWhitespace();
                continue;
            }
            if (this.currentChar === '$') {
                this.advance();
                return new Token('EOP', '$');
            }
            if (/[0-9]/.test(this.currentChar))
                return this.number();
            if (/[a-z]/.test(this.currentChar))
                return this.identifier();
            // Modified string handling
            if (this.currentChar === '"' ||
                (this.position > 0 &&
                    this.input[this.position - 1] === '"' &&
                    !this.input.slice(this.position, this.position + 1).includes('"'))) {
                return this.string();
            }
            const singleCharTokens = {
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
function compile() {
    const sourceCode = document.getElementById('sourceCode').value;
    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = '';
    const lexer = new Lexer(sourceCode);
    let token;
    let output = `<h3>Program 1</h3><table><tr><th>Token Type</th><th>Value</th></tr>`;
    let warnings = [];
    let foundEOP = false;
    while ((token = lexer.getNextToken()).type !== 'EOF') {
        if (token.type === 'EOP') {
            foundEOP = true;
        }
        output += `<tr><td>${token.type}</td><td>${token.value}</td></tr>`;
    }
    output += '</table>';
    if (!foundEOP)
        warnings.push('Warning: Program must end with "$"');
    if (warnings.length > 0)
        output += warnings.map(w => `<div class='warning'>${w}</div>`).join('');
    if (lexer.errors.length > 0)
        output += lexer.errors.map(e => `<div class='error'>${e}</div>`).join('');
    outputDiv.innerHTML = output;
}
//# sourceMappingURL=lexer.js.map