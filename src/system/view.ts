import vscode, { l10n } from "vscode";
import { ContainerCLI } from "../core/cli";
import { Node, NodeView } from "../core/nodeview";
import { getContainerVersion, setVSCodeContext } from "../extension";

export function initializeSystemView(context: vscode.ExtensionContext) {
  const systemView = new SystemView();
  const systemTreeView = vscode.window.createTreeView(
    `apple-container.system`, {
    treeDataProvider: systemView,
    showCollapseAll: true,
  });

  systemTreeView.description = l10n.t('Version {0}', getContainerVersion());

  context.subscriptions.push(
    systemTreeView,
    vscode.commands.registerCommand("apple-container.system.refresh", () => systemView.refresh()),
    vscode.commands.registerCommand("apple-container.system.start", () => {
      const start = ContainerCLI.startService();
      if (start.succesful) {
        vscode.window.showInformationMessage(l10n.t('Apple Container service successfully started.'));
      }
      else {
        vscode.window.showErrorMessage(l10n.t('Failed to start Apple Container service: {0)', start.error || start.output));
      }
      systemView.refresh();
    }),
    vscode.commands.registerCommand("apple-container.system.stop", () => {
      const stop = ContainerCLI.stopService();
      if (stop.succesful) {
        vscode.window.showInformationMessage(l10n.t('Apple Container service successfully stopped.'));
      }
      else {
        vscode.window.showErrorMessage(l10n.t('Failed to stop Apple Container service: {0)', stop.error || stop.output));
      }
      systemView.refresh();
    })
  );
}

class SystemView extends NodeView {
  async getRoot() {
    if (getContainerVersion()) {
      const status = ContainerCLI.status();
      setVSCodeContext('apple-container.running', status.succesful);
      return [
        new StatusNode(status.succesful, status.error || status.output)
      ];
    }
    else {
      return [new Node(l10n.t('container is not installed'), { state: vscode.TreeItemCollapsibleState.None })];
    }
  }
}

class StatusNode extends Node {
  constructor(running: boolean, tooltip: string) {
    super(l10n.t('Status'), {
      state: vscode.TreeItemCollapsibleState.None,
      icon: running ? 'pass' : 'error',
      color: running ? "testing.iconPassed" : "testing.iconFailed"
    });
    this.contextValue = `apple-container.statusNode.${running ? 'running' : 'stopped'}`;
    this.description = running ? l10n.t("Running") : l10n.t("Stopped");
    this.tooltip = tooltip;
  }
}