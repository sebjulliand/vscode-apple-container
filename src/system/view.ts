import vscode, { l10n } from "vscode";
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
      return [];
    }
    else {
      return [new Node(l10n.t('container is not installed'), { state: vscode.TreeItemCollapsibleState.None })];
    }
  }
}