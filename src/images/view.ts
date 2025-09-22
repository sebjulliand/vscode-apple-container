import vscode, { l10n } from "vscode";
import { ContainerCLI } from "../core/cli";
import { Node, NodeView } from "../core/nodeview";
import { fullImageName } from "../core/utils";
import { ContainerImage } from "../types";

export function initializeImagesView(context: vscode.ExtensionContext) {
  const imagesView = new ImagesView();
  const imagesTreeView = vscode.window.createTreeView(
    `apple-container.images`, {
    treeDataProvider: imagesView,
    showCollapseAll: true,
    canSelectMany: true
  });

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
    vscode.commands.registerCommand("apple-container.images.prune", async () => {
      if (await vscode.window.showInformationMessage(l10n.t(`Are you sure you want to remove unreferenced and dangling images?`), { modal: true }, l10n.t('Yes'))) {
        const result = ContainerCLI.pruneImages();
        if (result.succesful) {
          vscode.window.showInformationMessage(result.output.split('\n').join('; '));
          imagesView.refresh();
        }
        else {
          vscode.window.showErrorMessage(l10n.t("Failed to prune images: {0}", result.output));
        }
      }
    }),
    vscode.commands.registerCommand("apple-container.images.delete", async (node: ImageNode, nodes?: ImageNode[]) => {
      const images = (nodes || [node]).map(n => n.image);
      const detail = images.map(image => `- ${fullImageName(image)}`).join('\n');
      if (await vscode.window.showInformationMessage(l10n.t(`Are you sure you want to delete the selected image(s)?`), { modal: true, detail }, l10n.t('Yes'))) {
        vscode.window.withProgress({ title: l10n.t('Deleting container image'), location: vscode.ProgressLocation.Notification }, async (task) => {
          const increment = 100 / images.length;
          for (const image of images) {
            task.report({ message: fullImageName(image) });
            const result = ContainerCLI.deleteImage(image);
            if (result.succesful) {
              imagesView.refresh();
            }
            else {
              vscode.window.showErrorMessage(l10n.t('Failed to delete image: {0}', result.output));
            }
            task.report({ message: fullImageName(image), increment });
          }
        });
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
    super(image.name, { icon: 'file-binary' });
    this.contextValue = `apple-container.imageNode`;
    this.description = image.tag;
    this.tooltip = image.size;
  }
}