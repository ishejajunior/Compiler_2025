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

