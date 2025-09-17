import * as vscode from 'vscode';

let extensionId = "";

let output: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
	extensionId = context.extension.id;
	context.subscriptions.push(
		(output = vscode.window.createOutputChannel("Apple Container", "log"))
	);

	console.log(vscode.l10n.t(`{0} version {1} activated`, extensionId, context.extension.packageJSON.version));
}

export function deactivate() {
	console.log(vscode.l10n.t(`{0} deactivated`, extensionId));
}

export namespace Output {
	export function appendLineAndThrow(message: string): never {
		appendLine(vscode.l10n.t("[Error] {0}", message));
		throw new Error(message);
	}

	export function append(message: string) {
		output.append(message);
	}

	export function appendLine(message: string) {
		output.appendLine(message);
	}
}