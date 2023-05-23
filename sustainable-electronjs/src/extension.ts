import * as vscode from 'vscode';
import * as path from 'path';
import { subscribeToDocumentChanges, ELEM_MENTION } from './diagnostics';
import { SuiteFunction } from 'mocha';
const fs = require('fs');/*
*	additional classes for command 1
*/ 

interface PackageJson {
	name: string;
	types?: string;
	dependencies?: { [key: string]: string };
	devDependencies?: { [key: string]: string };
}

function shouldMark(targetPackage: string): Promise<boolean> {
	return new Promise(function (resolve, reject) {

		var npmApi = require('npm-api');
		let npm = new npmApi();
		var repo = npm.repo(targetPackage);
		
		repo.package()
		.then(function(dependencies: {}) {
			let dependencyNum = Object.keys(dependencies).length;
			if (dependencyNum < 10) {
				resolve(false);
			}
			else {
				resolve(true);
			}
		}, function(err: any) {
			console.log(err);
		});
		
	});
}

async function getDiagnostics(doc: vscode.TextDocument, context:vscode.ExtensionContext): Promise<vscode.Diagnostic[]> {
	const text = doc.getText();
	const diagnostics = new Array<vscode.Diagnostic>();

	let packageJson: PackageJson;
	try {
		packageJson = JSON.parse(text);
	} catch(e) {
		return diagnostics;
	}

	const textArr: string[] = text.split(/\r\n|\n/);
	const indexOfFirstDep = textArr.findIndex((value: string) => new RegExp(`\s*"dependencies"`).test(value)) + 1;

	
	
	if (indexOfFirstDep !== -1) {
		let i = indexOfFirstDep;
		while (textArr.length > i && !/\s*}/.test(textArr[i])) {
			const arr = /\s*"(.*)"\s*:/.exec(textArr[i]);
			if(!arr) {
				i++;
				continue;
			}
			const key = arr[1];
			
			if (await shouldMark(key)) {
				const start = textArr[i].indexOf(key);
				const end = start + key.length;
				diagnostics.push({
					severity: vscode.DiagnosticSeverity.Warning,
					message: 'This module is known to have a high dependency count - if possible consider replacing it with a leaner alternative.',
					code:	{value:'high-dependency-count-detected', target:vscode.Uri.file(path.join(context.extensionPath,'out', 'wiki', 'index.html'))},
					source: 'Sustainable Electron',
					range: new vscode.Range(i, start, i, end)
				});
			}
			i++;
		}
	}

	return diagnostics;
}

/*
*	additional classes for command 2
*/ 


function addToLog(input:string) {            
    // Write data in 'Output.txt' .
    fs.writeFile('log.txt', input, (err: any) => {
        // In case of a error throw err.
        if (err) {throw err;}
    });
}

const COMMAND = 'sustainable-electronjs.openWiki';

export class JavaReducter implements vscode.CodeActionProvider {

	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix
	];

	public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
		const commandAction = this.createCommand();

		return [
			commandAction
		];
	}

	private createCommand(): vscode.CodeAction {
		const action = new vscode.CodeAction('Learn more...', vscode.CodeActionKind.Empty);
		action.command = { command: COMMAND, title: 'Learn more about modern css', tooltip: 'This will take you to the Sustainable WIKI website to learn more.' };
		return action;
	}
}

export class ElementInfo implements vscode.CodeActionProvider {

	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix
	];

	provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.CodeAction[] {
		return context.diagnostics
			.filter(diagnostic => diagnostic.code === ELEM_MENTION)
			.map(diagnostic => this.createCommandCodeAction(diagnostic));
	}

	private createCommandCodeAction(diagnostic: vscode.Diagnostic): vscode.CodeAction {
		const action = new vscode.CodeAction('Learn more...', vscode.CodeActionKind.QuickFix);
		action.command = { command: COMMAND, title: 'Learn more about modern css', tooltip: 'This will take you to the Sustainable WIKI to learn more.' };
		action.diagnostics = [diagnostic];
		action.isPreferred = true;
		return action;
	}
}



/**
 * 	code for the commands
 */
export function activate(context: vscode.ExtensionContext) {

    let disposable = vscode.commands.registerCommand('sustainable-electronjs.highlightLargeDependencies', async () => {
		// Code for command 1 goes here
		const diagnosticCollection = vscode.languages.createDiagnosticCollection('connected-dependencies');
		const handler = async (doc: vscode.TextDocument) => {
			if(!doc.fileName.endsWith('package.json')) {
				return;
			}
		
			const diagnostics = await getDiagnostics(doc, context);
			diagnosticCollection.set(doc.uri, diagnostics);
		};
		
		const didOpen = vscode.workspace.onDidOpenTextDocument(doc => handler(doc));
		const didChange = vscode.workspace.onDidChangeTextDocument(e => handler(e.document));
		
		// If we have an activeTextEditor when we open the workspace, trigger the handler
		if (vscode.window.activeTextEditor) {
			await handler(vscode.window.activeTextEditor.document);
		}
		
		// Push all of the disposables that should be cleaned up when the extension is disabled
		context.subscriptions.push(
			diagnosticCollection,
			didOpen,
			didChange
		);
	});

    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('sustainable-electronjs.openWiki', () => {
		const onDiskPath = vscode.Uri.file(
			path.join(context.extensionPath,'out', 'wiki', 'index.html')
		);
		
		// const content = panel.webview.asWebviewUri(onDiskPath);
		vscode.env.openExternal(onDiskPath);
		
    }); 
    
	context.subscriptions.push(disposable);

	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('javascript', new JavaReducter(), {
			providedCodeActionKinds: JavaReducter.providedCodeActionKinds
		}));

	const htmlRefDiagnostics = vscode.languages.createDiagnosticCollection(".getElementById");
	context.subscriptions.push(htmlRefDiagnostics);

	subscribeToDocumentChanges(context, htmlRefDiagnostics);

	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('javascript', new ElementInfo(), {
			providedCodeActionKinds: ElementInfo.providedCodeActionKinds
		})
	);

	
}

export function deactivate() {}

