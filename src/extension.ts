import * as vscode from 'vscode';
import { ContainerCLI } from './core/cli';
import { CustomWebview } from './core/webview';
import { initializeImagesView } from './images/view';
import { initializeSystemView } from './system/view';

let extensionId = "";
let containerVersion = "";
let output: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
	extensionId = context.extension.id;
	context.subscriptions.push(
		(output = vscode.window.createOutputChannel("Apple Container", "log"))
	);

	const version = ContainerCLI.version();
	output.appendLine(version.output);
	const installed = version.succesful;
	if (installed) {
		containerVersion = /(\d+\.\d+\.\d+)/.exec(version.output)?.at(1) || "?";
		setVSCodeContext('apple-container.installed', true);
		initializeImagesView(context);
	}

	initializeSystemView(context);
	CustomWebview.initialize(context);
	console.log(vscode.l10n.t(`{0} version {1} activated`, extensionId, context.extension.packageJSON.version));
}

export function deactivate() {
	console.log(vscode.l10n.t(`{0} deactivated`, extensionId));
}

export function setVSCodeContext(key: string, value: any) {
	vscode.commands.executeCommand(`setContext`, key, value);
}

export function getContainerVersion() {
	return containerVersion;
}

export namespace Output {
	export function appendErrorAndThrow(message: string): never {
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