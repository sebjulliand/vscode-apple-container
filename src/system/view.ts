import vscode, { l10n } from "vscode";
import { ContainerCLI } from "../core/cli";
import { Node, NodeView } from "../core/nodeview";
import { getContainerVersion } from "../extension";

export function initializeSystemView(context: vscode.ExtensionContext) {
  const systemView = new SystemView();
  const systemTreeView = vscode.window.createTreeView(
    `apple-container.system`, {
    treeDataProvider: systemView,
    showCollapseAll: true,
  });

  systemTreeView.description = l10n.t('Version {0}', getContainerVersion());

  context.subscriptions.push(
    systemTreeView
  );
}

class SystemView extends NodeView {
  async getRoot() {
    if (getContainerVersion()) {
      return [
        new StatusNode()
      ];
    }
    else {
      return [new Node(l10n.t('container is not installed'), { state: vscode.TreeItemCollapsibleState.None })];
    }
  }
}

class StatusNode extends Node {
  constructor(){
    const result = ContainerCLI.status();
    const running = result.code === 0;
    super(l10n.t('Status'), { 
      state: vscode.TreeItemCollapsibleState.None,
     });
     this.contextValue = 'apple-container.statusNode';
     this.description = running ? l10n.t("Running") : l10n.t("Stopped");
     this.tooltip = result.output;
  }
}