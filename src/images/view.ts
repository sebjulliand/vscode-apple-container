import vscode, { l10n } from "vscode";
import { ContainerCLI } from "../core/cli";
import { Node, NodeView } from "../core/nodeview";
import { ContainerImage } from "../types";

export function initializeImagesView(context: vscode.ExtensionContext) {
  const imagesView = new ImagesView();
  const imagesTreeView = vscode.window.createTreeView(
    `apple-container.images`, {
    treeDataProvider: imagesView,
    showCollapseAll: true,
  });

  imagesTreeView.badge = { tooltip: '', value: 3 };

  context.subscriptions.push(
    imagesTreeView,
    vscode.commands.registerCommand("apple-container.images.refresh", () => imagesView.refresh()),
    vscode.commands.registerCommand("apple-container.images.pull", async () => {
      const image = await vscode.window.showInputBox({
        title: l10n.t('Pull container image'),
        prompt: l10n.t('Enter the name and tag of the image to pull'),
        placeHolder: l10n.t('name:tag')
      });

      if (image) {
        const result = await vscode.window.withProgress({ title: l10n.t('Pulling container image {0}', image), location: vscode.ProgressLocation.Notification }, async () => ContainerCLI.pullImage(image));
        if (result.succesful) {
          imagesView.refresh();
        }
      }
    }),
    vscode.commands.registerCommand("apple-container.images.delete", async (node: ImageNode) => {
      if (await vscode.window.showInformationMessage(l10n.t(`Are you sure you want to delete image {0}:{1}?`, node.image.name, node.image.tag), { modal: true }, l10n.t('Yes'))) {
        const result = ContainerCLI.deleteImage(node.image);
        if (result.succesful) {
          imagesView.refresh();
        }
        else {
          vscode.window.showErrorMessage(l10n.t('Failed to delete image: {0}', result.error || result.output));
        }
      }
    })
  );
}

class ImagesView extends NodeView {
  async getRoot() {
    return ContainerCLI.listImages().map(image => new ImageNode(image));
  }
}

class ImageNode extends Node {
  constructor(readonly image: ContainerImage) {
    super(image.name, {
      state: vscode.TreeItemCollapsibleState.None,
      icon: 'file-binary'
    });
    this.contextValue = `apple-container.imageNode`;
    this.description = image.tag;
    this.tooltip = image.size;
  }
}