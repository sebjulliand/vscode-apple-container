import vscode, { l10n } from "vscode";
import { ContainerCLI } from "../core/cli";
import { fullImageName } from "../core/utils";
import { CustomWebview, openWebview } from "../core/webview";
import { Form } from "../core/webview-toolkit";
import { ContainerImage } from "../types";

class CreateContainerPanel extends CustomWebview {
  constructor(title: string, readonly image: ContainerImage) {
    super('create-container', title);
  }

  protected getWebviewBody(webview: vscode.Webview) {
    const dnsDomains = ContainerCLI.listDNS().output.split("\n").map(line => line.trim()).filter(Boolean);
    return Form.render({
      id: 'create-container',
      elements: [
        Form.input("name", l10n.t('Container name')),
        Form.input("entrypoint", l10n.t('Entrypoint override')),
        Form.select("dns-domain", l10n.t("DNS domain"), dnsDomains.map(dns => ({ value: dns }))),
        Form.checkbox('ssh', l10n.t("Forward SSH agent socket to container")),
        Form.button('create', l10n.t("Create container"))
      ],
      class: 'centered'
    });
  }
}

export function openCreateContainerPanel(image: ContainerImage) {
  openWebview(l10n.t('Create container {0}', fullImageName(image)), (t) => new CreateContainerPanel(t, image));
}