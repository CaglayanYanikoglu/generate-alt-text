const vscode = require('vscode');
const axios = require('axios');

/**
 * @param {vscode.ExtensionContext} context
 */

class CodelensProvider {

	codeLenses = [];
	regex;
	_onDidChangeCodeLenses = new vscode.EventEmitter();
	onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

	constructor() {
		this.regex = /<img[^>]*\/?>/g;

		vscode.workspace.onDidChangeConfiguration((_) => {
			this._onDidChangeCodeLenses.fire();
		});
	}

	provideCodeLenses(document, token) {
		if (vscode.workspace.getConfiguration("codelens-sample").get("enableCodeLens", true)) {
			this.codeLenses = [];
			const regex = new RegExp(this.regex);
			const text = document.getText();
			let matches;
			while ((matches = regex.exec(text)) !== null) {
				// if alt attribute exist, continue
				if (matches[0].includes('alt')) continue;

				const line = document.lineAt(document.positionAt(matches.index).line);
				const indexOf = line.text.indexOf(matches[0]);
				const position = new vscode.Position(line.lineNumber, indexOf);
				const range = document.getWordRangeAtPosition(position, new RegExp(this.regex));
				console.log('position:', position)
				console.log('range: ', range)
				if (range) {
					this.codeLenses.push(new vscode.CodeLens(range, {
						title: "Generate Alt Text",
						tooltip: "Generating alt text for image",
						command: "codelens-sample.codelensAction",
						arguments: [{ matches, range }]
					}));
				}
			}
			return this.codeLenses;
		}
		return [];
	}

}

const editor = vscode.window.activeTextEditor;

function provideGenerateButton(images) {
	return matches.map(match => new vscode.CodeLens(match.range, {
		title: 'Test Regex...',
		command: 'extension.toggleRegexPreview',
		arguments: [match]
	}));
}

async function generateAltText(image, range) {
	if (editor) {
		const word = image;

		// TODO: if no selection show error
		if (!word) return;

		const rex = /<img[^>]+src="?([^"\s]+)"?\s*\/>/g;

		const matches = rex.exec(word);
		if (!matches) return;

		const imageUrl = matches[1];

		if (!imageUrl) return;

		const url = "https://alt-text-generator.vercel.app/api/generate?imageUrl=" + imageUrl;
		const response = await axios(url);
		const altText = response.data;

		editor.edit(editBuilder => {
			const withAlt = word.replace('img', `img alt="${altText}"`);
			editBuilder.replace(range, withAlt);
			console.log('Successfully added.');
		});
	}
}


async function init() {
	console.log('init');
}

function activate(context) {
	console.log('Congratulations, your extension "generate-alt-text" is now active!');

	let disposable = vscode.commands.registerCommand('generate-alt-text.generateAltText', function () {
		init();
	});

	const codelensProvider = new CodelensProvider();

	vscode.languages.registerCodeLensProvider("*", codelensProvider);

	vscode.commands.registerCommand("codelens-sample.enableCodeLens", () => {
		vscode.workspace.getConfiguration("codelens-sample").update("enableCodeLens", true, true);
	});

	vscode.commands.registerCommand("codelens-sample.disableCodeLens", () => {
		vscode.workspace.getConfiguration("codelens-sample").update("enableCodeLens", false, true);
	});

	vscode.commands.registerCommand("codelens-sample.codelensAction", (args) => {
		generateAltText(args.matches[0], args.range)
	});

	context.subscriptions.push(disposable);
}

function deactivate() {

}

module.exports = {
	activate,
	deactivate
}
