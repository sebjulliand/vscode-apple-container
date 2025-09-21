import vscode from "vscode";

export type NodeParameters = {
  icon?: string
  color?: string
  state?: vscode.TreeItemCollapsibleState
  parent?: Node
};

export class Node extends vscode.TreeItem {
  constructor(label: string, readonly params?: NodeParameters) {
    super(label, params?.state);
    this.iconPath = params?.icon ? new vscode.ThemeIcon(params.icon, params.color ? new vscode.ThemeColor(params.color) : undefined) : undefined;
  }

  get parent() {
    return this.params?.parent;
  }

  getChildren?(): vscode.ProviderResult<Node[]>;
  refresh?(): void;
  getToolTip?(): Promise<vscode.MarkdownString | undefined>;
}

export abstract class NodeView implements vscode.TreeDataProvider<Node> {
  private readonly emitter = new vscode.EventEmitter<Node | undefined | null | void>;
  readonly onDidChangeTreeData: vscode.Event<Node | undefined | null | void> = this.emitter.event;

  getTreeItem(element: Node) {
    return element;
  }

  getChildren(element?: Node) {
    return element ? element.getChildren?.() : this.getRoot();
  }

  getParent(element: Node) {
    return element.parent;
  }

  refresh(target?: Node) {
    this.emitter.fire(target);
  }

  abstract getRoot() : vscode.ProviderResult<Node[]>;
}