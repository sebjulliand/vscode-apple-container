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
        vscode.window.showErrorMessage(l10n.t('Failed to start Apple Container service: {0)', start.output));
      }
      systemView.refresh();
    }),
    vscode.commands.registerCommand("apple-container.system.stop", () => {
      const stop = ContainerCLI.stopService();
      if (stop.succesful) {
        vscode.window.showInformationMessage(l10n.t('Apple Container service successfully stopped.'));
      }
      else {
        vscode.window.showErrorMessage(l10n.t('Failed to stop Apple Container service: {0)', stop.output));
      }
      systemView.refresh();
    }),
    vscode.commands.registerCommand("apple-container.system.dns.delete", async (node: DNSNode) => {
      const dns = node.dns;
      if (await vscode.window.showInformationMessage(l10n.t(`Are you sure you want to delete the DNS domain '{0}'?`, dns), { modal: true }, l10n.t('Yes'))) {
        const result = ContainerCLI.deleteDNS(dns);
        if (result.succesful) {
          node.parent?.refresh?.();
        }
        else {
          vscode.window.showErrorMessage(l10n.t("Failed to delete DNS domain '{0}': {1}", dns, result.output));
        }
      }
    }),
    vscode.commands.registerCommand("apple-container.system.dns.setDefault", (node: DNSNode) => {
      const dns = node.dns;
      const result = ContainerCLI.setDefaultDNS(dns);
      if (result.succesful) {
        node.parent?.refresh?.();
      }
      else {
        vscode.window.showErrorMessage(l10n.t("Failed to change default DNS domain: {0}", result.output));
      }
    })
  );
}

class SystemView extends NodeView {
  async getRoot() {
    if (getContainerVersion()) {
      const status = ContainerCLI.status();
      setVSCodeContext('apple-container.running', status.succesful);
      return [
        new StatusNode(status.succesful, status.output),
        new DNSDomainsNode()
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
      icon: running ? 'pass' : 'error',
      color: running ? "testing.iconPassed" : "testing.iconFailed"
    });
    this.contextValue = `apple-container.statusNode.${running ? 'running' : 'stopped'}`;
    this.description = running ? l10n.t("Running") : l10n.t("Stopped");
    this.tooltip = tooltip;
  }
}

class DNSDomainsNode extends Node {
  constructor() {
    super(l10n.t('DNS domains'), { icon: 'globe', state: vscode.TreeItemCollapsibleState.Collapsed });
    this.contextValue = 'apple-container.dnsDomainsNode';
  }

  getChildren() {
    const dnsList = ContainerCLI.listDNS();
    if (dnsList.succesful) {
      const defaultDNS = ContainerCLI.getDefaultDNS().output.trim();
      return dnsList.output
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(dns => new DNSNode(dns, dns === defaultDNS));
    }
  }
}

class DNSNode extends Node {
  constructor(readonly dns: string, isDefault: boolean) {
    super(dns, { icon: isDefault ? 'star-full' : undefined, color: isDefault ? 'charts.yellow' : undefined });
    this.contextValue = `apple-container.dnsNode${isDefault ? ".default" : ""}`;
  }
}