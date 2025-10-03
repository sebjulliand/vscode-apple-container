import vscode, { l10n } from "vscode";
import { ContainerCLI } from "../core/cli";
import { fullImageName } from "../core/utils";
import { CustomWebview, openWebview } from "../core/webview";
import { ContainerImage } from "../types";

class InpectImagePanel extends CustomWebview {
  constructor(title: string, readonly inspect: any) {
    super('inspect-image', title);

  }

  protected getWebviewBody(webview: vscode.Webview): string {
    throw new Error("Method not implemented.");
  }
}

export function openInspectPanel(image: ContainerImage) {
  const name = fullImageName(image);
  const result = ContainerCLI.inspectImage(image);
  if (result.succesful) {
    const object = (JSON.parse(result.output)[0].variants as any[])
      .flatMap(v => v.config.history)
      .map(h => h.created_by);

    openWebview(l10n.t('Inspect {0}', name), (t) => new InpectImagePanel(t, object));
  } else {
    vscode.window.showErrorMessage(l10n.t("Failed to inspect image {0}: {1}", name, result.output));
  }
}