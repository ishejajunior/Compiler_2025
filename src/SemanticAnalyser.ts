// Import Token type from lexer
interface Token {
    type: string;
    value: string | null;
    line: number;
    column: number;
}

// Symbol table entry interface
interface SymbolTableEntry {
    type: string;
    isInitialized: boolean;
    line: number;
    column: number;
}

// Symbol table class
class SymbolTable {
    private table: Map<string, SymbolTableEntry>;
    public parent: SymbolTable | null;

    constructor(parent: SymbolTable | null = null) {
        this.table = new Map();
        this.parent = parent;
    }
    // Add a symbol to the table
    addSymbol(name: string, type: string, line: number, column: number): boolean {
        if (this.table.has(name)) {
            return false; // Symbol already exists in this scope
        }
        this.table.set(name, { type, isInitialized: false, line, column });
        return true;
    }

    // Look up a symbol in the current scope and parent scopes
    lookupSymbol(name: string): SymbolTableEntry | null {
        const entry = this.table.get(name);
        if (entry) {
            return entry;
        }
        if (this.parent) {
            return this.parent.lookupSymbol(name);
        }
        return null;
    }
    