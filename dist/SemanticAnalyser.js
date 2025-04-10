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
}
//# sourceMappingURL=SemanticAnalyser.js.map