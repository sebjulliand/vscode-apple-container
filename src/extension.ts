import * as vscode from 'vscode';

let extensionId = "";
export function activate(context: vscode.ExtensionContext) {	
	extensionId = context.extension.id;
	console.log(vscode.l10n.t(`{0} version {1} activated`, extensionId, context.extension.packageJSON.version));

	context.subscriptions.push(
		
	);
}

export function deactivate() {
	console.log(vscode.l10n.t(`{0} deactivated`, extensionId));
}
