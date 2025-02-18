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
        this.currentErrorMessage = '';
    }
    error(message) {
        const errorMessage = `LEXER --> | Error: ${message} on line ${this.line}:${this.column}`;
        this.errors.push(errorMessage); // Keep track for error count
        // Store the error message in a property to be displayed at the right time
        this.currentErrorMessage = `<div style="color: red; font-weight: bold; margin-left: 20px;">${errorMessage}</div>`;
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
        // Handle each character within the string
        if (!this.currentChar) {
            return new Token('ERROR', null);
        }
        // Only allow valid characters in strings
        if (/[a-z]/.test(this.currentChar) || /[0-9]/.test(this.currentChar) || this.currentChar === ' ') {
            const char = this.currentChar;
            this.advance();
            const token = new Token('CHAR', char);
            token.line = this.line;
            token.column = this.column - 1;
            return token;
        }
        // Invalid character in string
        this.error(`Invalid character '${this.currentChar}' in string`);
        const token = new Token('ERROR', this.currentChar);
        token.line = this.line;
        token.column = this.column;
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
                const nextChar = this.peek();
                this.advance();
                if (nextChar === '=') {
                    this.advance();
                    const token = new Token('BOOLOP', '!=');
                    token.line = this.line;
                    token.column = this.column - 2;
                    return token;
                }
                this.error("Expected '=' after '!'");
                const token = new Token('ERROR', '!');
                token.line = this.line;
                token.column = this.column;
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
            // Make invalid character error more specific
            const invalidChar = this.currentChar;
            this.error(`Invalid character '${invalidChar}'`);
            const token = new Token('ERROR', invalidChar);
            token.line = this.line;
            token.column = this.column;
            return token;
        }
        const token = new Token('EOF', null);
        token.line = this.line;
        token.column = this.column;
        return token;
    }
    // Helper method to format token output
    formatToken(type, value) {
        let displayValue = value === null ? '' : value;
        let style = '';
        // Don't display ERROR tokens since we show the error message instead
        if (type === 'ERROR') {
            return ''; // Return empty string for ERROR tokens
        }
        return `<span style="${style}">LEXER --> | ${type} [ ${displayValue} ] on line ${this.line}:${this.column - (displayValue.length || 0)}</span>`;
    }
    // Add a method to get program status
    getProgramStatus() {
        if (this.errors.length === 0) {
            return `<div style="color: #4CAF50; font-weight: bold;">LEXER --> | Program completed successfully with 0 errors</div>`;
        }
        else {
            return `<div style="color: red; font-weight: bold;">LEXER --> | Program failed with ${this.errors.length} error${this.errors.length > 1 ? 's' : ''}</div>`;
        }
    }
}
function compile() {
    const sourceCode = document.getElementById('sourceCode').value;
    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = '';
    const lexer = new Lexer(sourceCode);
    let token;
    let programCount = 1;
    let currentOutput = `<h3>Program ${programCount}</h3>`;
    let warnings = [];
    let foundEOP = false;
    try {
        while ((token = lexer.getNextToken()).type !== 'EOF') {
            // Add token to current program output
            currentOutput += `<div>${lexer.formatToken(token.type, token.value)}</div>`;
            // If there's an error message, display it right after the token
            if (lexer.currentErrorMessage) {
                currentOutput += lexer.currentErrorMessage;
                lexer.currentErrorMessage = ''; // Clear the message after using it
            }
            if (token.type === 'EOP') {
                foundEOP = true;
                // Add program status before moving to next program
                currentOutput += lexer.getProgramStatus();
                outputDiv.innerHTML += currentOutput;
                // Reset for next program
                programCount++;
                currentOutput = `<h3>Program ${programCount}</h3>`;
                foundEOP = false;
                lexer.errors = []; // Reset error count for next program
                continue;
            }
        }
        // Handle the last program
        if (currentOutput.includes('LEXER -->')) {
            // Display any remaining error message
            if (lexer.currentErrorMessage) {
                currentOutput += lexer.currentErrorMessage;
            }
            if (!foundEOP) {
                warnings.push(`LEXER --> | Warning: Program ${programCount} ended without an EOP ($) symbol on line ${lexer.line}:${lexer.column}`);
            }
            if (warnings.length > 0) {
                currentOutput += warnings.map(w => `<div style="color: #FFB100; font-weight: bold;">${w}</div>`).join('');
            }
            // Add final program status
            currentOutput += lexer.getProgramStatus();
            outputDiv.innerHTML += currentOutput;
        }
    }
    catch (error) {
        outputDiv.innerHTML += `<div class='error'>LEXER --> | Fatal error in Program ${programCount}: ${error}</div>`;
    }
}
//# sourceMappingURL=lexer.js.map