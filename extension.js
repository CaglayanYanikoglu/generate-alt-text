const vscode = require('vscode');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const GENERATE_ALT_TEXT_URL = 'https://ai-caption-generator.vercel.app/';

/**
 * @param {vscode.ExtensionContext} context
 */

class CodelensProvider {

	codeLenses = [];
	regex;
	_onDidChangeCodeLenses = new vscode.EventEmitter();
	onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

	constructor() {
		this.regex = /<img\b(?!.*\balt\b).*?>/gi

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
				const line = document.lineAt(document.positionAt(matches.index).line);
				const indexOf = line.text.indexOf(matches[0]);
				const position = new vscode.Position(line.lineNumber, indexOf);
				const range = document.getWordRangeAtPosition(position, new RegExp(this.regex));

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

function checkContainHttps (imageUrl) {
	return imageUrl.includes('https') || imageUrl.includes('www');
}

function removeSlash (imageUrl) {
	if (imageUrl[0] === '/') {
		return imageUrl.slice(1);
	}
	if (imageUrl.endsWith('/')) {
    return imageUrl.slice(0, -1);
  }
	return imageUrl;
}

let processingImages = [];

async function generateAltText(image, range) {
	const editor = vscode.window.activeTextEditor;
	const srcRegex = /src=['"]([^'"]*)['"]/;
	const matches = srcRegex.exec(image);
	if (!matches) {
		console.log('No src found.');
		return;
	}

	let imageUrl = matches[1];

	const folders = vscode.workspace.workspaceFolders;

	const configFile = '.accessibility';
	const filePath = `${folders[0].uri.fsPath}/${configFile}`;

	// Check .accessibility config file is exist
	if (fs.existsSync(path.join(folders[0].uri.fsPath, configFile))) {
		const rawData = fs.readFileSync(filePath);
		const config = JSON.parse(rawData);

		if (config && config.domain && !checkContainHttps(imageUrl)) {
			// if imageUrl has / at the beginning, remove it.
			imageUrl = removeSlash(imageUrl);
			const configDomain = removeSlash(config.domain);
			imageUrl = `${configDomain}/${imageUrl}`
		}
	}

	if (processingImages.includes(imageUrl)) return;
	processingImages.push(imageUrl);

	try {
		const response = await axios.post(GENERATE_ALT_TEXT_URL, {
			image: imageUrl
		});
		const altText = response.data;

		editor.edit(editBuilder => {
			const withAlt = image.replace('img', `img alt="${altText}"`);
			editBuilder.replace(range, withAlt);
			console.log('Successfully added.');
		});
	} catch (error) {
		console.log(error);
	} finally {
		processingImages = processingImages.filter(image => image !== imageUrl);
	}
}


async function init() {
	console.log('init');
}

function activate(context) {
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

function deactivate() { }

module.exports = {
	activate,
	deactivate
}
