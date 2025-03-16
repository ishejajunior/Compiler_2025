// Node class for the CST
class TreeNode {
    name: string;
    children: TreeNode[];
    value?: string;

    constructor(name: string, value?: string) {
        this.name = name;
        this.children = [];
        this.value = value;
    }

    addChild(node: TreeNode): void {
        this.children.push(node);
    }
}

class Parser {
    private tokens: Token[];
    private currentTokenIndex: number;
    private errors: string[];
    private warnings: string[];
    private cst: TreeNode | null;
    private debugCallback?: (message: string) => void;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
        this.currentTokenIndex = 0;
        this.errors = [];
        this.warnings = [];
        this.cst = null;
    }
    
