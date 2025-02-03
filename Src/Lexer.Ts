class Token {
    type: string;
    value: string | null;

    constructor(type: string, value: string | null) {
        this.type = type;
        this.value = value;
    }
}

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
        this.errors.push(message);
    }
    advance(): void {
        this.position++;
        this.currentChar = this.input[this.position] || null;
    }
}






