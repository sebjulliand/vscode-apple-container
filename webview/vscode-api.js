const vscodeAPI = acquireVsCodeApi();

function sendWebviewMessage(message) {
	vscodeAPI.postMessage(message);
}

function sendWebviewAction(actionId, contentIndex) {
	sendWebviewMessage({
		type: "WebviewAction",
		action: actionId
	});
}

function sendWebviewListAction(actionId, contentIndex) {
	sendWebviewMessage({
		type: "WebviewListAction",
		action: actionId,
		contentIndex: contentIndex
	});
}

function sendWebviewFormAction(actionId, form) {
	sendWebviewMessage({
		type: "WebviewFormAction",
		action: actionId,
		form
	});
}

function sendWebviewUpdateAction(formId) {
	const invalid = Boolean(document.querySelector(":invalid"));
	const data = document.querySelector('#' + formId).data;
	sendWebviewMessage({
		type: "WebviewUpdateAction",
		data,
		invalid
	});
}