import vscode from "vscode";

export interface WebviewAction {
	action: string
};

export interface WebviewListAction extends WebviewAction {
	action: string
	contentIndex: number
};

export interface WebviewFormAction extends WebviewAction {
	action: string
	form: Record<string, string | string[]>
};

export type WebviewUpdateAction = {
	data: Record<string, string | string[]>
	invalid?: boolean
};

const webviews: Map<string, CustomWebview> = new Map();

export abstract class CustomWebview {
	private static root: vscode.Uri;
	static initialize(context: vscode.ExtensionContext) {
		CustomWebview.root = context.extensionUri;

	}

	private readonly panel: vscode.WebviewPanel;
	constructor(type: string, readonly title: string, readonly column: vscode.ViewColumn = vscode.ViewColumn.One) {
		this.panel = vscode.window.createWebviewPanel(type, this.title, column, {
			enableFindWidget: true,
			enableScripts: true,
			retainContextWhenHidden: true
		});
		this.panel.onDidDispose(() => this.dispose());
		this.panel.webview.onDidReceiveMessage(message => this.handleWebviewMessage(message));
	}

	load() {
		this.panel.webview.html = this.getWebviewContent(this.panel.webview);
	}

	protected getWebviewContent(webview: vscode.Webview): string {
		return /*html*/ `
		  <!DOCTYPE html>
		  <html lang="en">
			<head>
			  ${this.getWebviewHead(webview)}
			</head>
			<body>
 				${this.getWebviewBody(webview)}
				<script defer>
					window.addEventListener('message', event => {
						const message = event.data;
						if(message){
							${this.messageEventScript()};
						}
					});

					for (const listener of document.querySelectorAll('[changeListener]')) {												
						listener.addEventListener(listener.dataset.onevent, (event) => {		
							sendWebviewUpdateAction(listener.dataset.relatedform);
						});
					}
				</script>
			</body>
		  </html>
		`;
	}

	protected abstract getWebviewBody(webview: vscode.Webview): string;

	private getWebviewHead(webview: vscode.Webview): string {
		return /*html*/ `<meta charset="UTF-8">
			<meta name="viewport" content = "width=device-width, initial-scale=1.0">			
			<script type="module" src="${webview.asWebviewUri(vscode.Uri.joinPath(CustomWebview.root, "dist", "vscode-elements.js"))}"></script>
			<link href="${webview.asWebviewUri(vscode.Uri.joinPath(CustomWebview.root, "webview", "style.css"))}" rel="stylesheet">
			<script src="${webview.asWebviewUri(vscode.Uri.joinPath(CustomWebview.root, "webview", "vscode-api.js"))}"></script>
			${this.title ? `<title>${this.title}</title>` : ''}`;
	}

	protected handleWebviewMessage(message: any) {
		if (message && message.type) {
			switch (message.type) {
				case "WebviewListAction":
					this.processWebviewListAction(message);
					break;
				case "WebviewFormAction":
					this.processWebviewFormAction(message);
					break;
				case "WebviewUpdateAction":
					this.processWebviewUpdateAction(message);
					break;
				default:
					this.processWebviewAction(message);
					break;
			}
		}
	}

	protected processWebviewAction(action: WebviewAction) {
		//Override to process actions
	}

	protected processWebviewListAction(action: WebviewListAction) {
		//Override to process list actions
	}

	protected processWebviewFormAction(action: WebviewFormAction) {
		//Override to process form actions
	}

	protected processWebviewUpdateAction(action: WebviewUpdateAction) {
		//Override to process form actions
	}

	/**
	 * Returns the body of a JavaScript function with the following prototype: (message: string).
	 * This function must handle messages received by the webview.
	 * 
	 * @returns JavaScript code
	 */
	protected messageEventScript() {
		return /* javascript */ `console.log(message);`;
	}

	dispose() {
		this.panel.dispose();
		webviews.delete(this.title);
	}

	public reveal() {
		this.panel.reveal(this.column);
	}
}

export function openWebview(title: string, panelProvider: (title: string) => CustomWebview, forceReopen?: boolean) {
	const openPanel = webviews.get(title);
	if (openPanel) {
		if (forceReopen) {
			openPanel.dispose();
		}
		else {
			openPanel.reveal();
		}
	}

	if (forceReopen || !openPanel) {
		const panel = panelProvider(title);
		webviews.set(title, panel);
		panel.load();
	}
}