import * as vscode from 'vscode';
export const ELEM_MENTION = 'elem_mention';

const ELEM = '.getElementById';
export function refreshDiagnostics(doc: vscode.TextDocument, elemDiagnostics: vscode.DiagnosticCollection): void {
	const diagnostics: vscode.Diagnostic[] = [];

	for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
		const lineOfText = doc.lineAt(lineIndex);
		if (lineOfText.text.includes(ELEM)) {
			diagnostics.push(createDiagnostic(doc, lineOfText, lineIndex));
		}
	}

	elemDiagnostics.set(doc.uri, diagnostics);
}

function createDiagnostic(doc: vscode.TextDocument, lineOfText: vscode.TextLine, lineIndex: number): vscode.Diagnostic {
	const index = lineOfText.text.indexOf(ELEM);
	const range = new vscode.Range(lineIndex, index, lineIndex, index + ELEM.length);
	const diagnostic = new vscode.Diagnostic(range, "When you use 'getElementById', in JavaScript it may be possible to replace it with modern CSS",
		vscode.DiagnosticSeverity.Information);
	diagnostic.code = ELEM_MENTION;
	return diagnostic;
}

export function subscribeToDocumentChanges(context: vscode.ExtensionContext, elemDiagnostics: vscode.DiagnosticCollection): void {
	if (vscode.window.activeTextEditor) {
		refreshDiagnostics(vscode.window.activeTextEditor.document, elemDiagnostics);
	}
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				refreshDiagnostics(editor.document, elemDiagnostics);
			}
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(e => refreshDiagnostics(e.document, elemDiagnostics))
	);

	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument(doc => elemDiagnostics.delete(doc.uri))
	);

}