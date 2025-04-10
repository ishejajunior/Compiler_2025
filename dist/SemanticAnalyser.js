// Symbol table class
class SymbolTable {
    constructor(parent = null) {
        this.table = new Map();
        this.parent = parent;
    }
    // Add a symbol to the table
    addSymbol(name, type, line, column) {
        if (this.table.has(name)) {
            return false; // Symbol already exists in this scope
        }
        this.table.set(name, { type, isInitialized: false, line, column });
        return true;
    }
    // Look up a symbol in the current scope and parent scopes
    lookupSymbol(name) {
        const entry = this.table.get(name);
        if (entry) {
            return entry;
        }
        if (this.parent) {
            return this.parent.lookupSymbol(name);
        }
        return null;
    }
    // Mark a symbol as initialized
    markInitialized(name) {
        const entry = this.table.get(name);
        if (entry) {
            entry.isInitialized = true;
            return true;
        }
        if (this.parent) {
            return this.parent.markInitialized(name);
        }
        return false;
    }
    // Get all symbols in the current scope
    getSymbols() {
        return this.table;
    }
}
//# sourceMappingURL=SemanticAnalyser.js.map