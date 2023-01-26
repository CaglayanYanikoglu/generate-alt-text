const vscode = require('vscode');
const axios = require('axios');

/**
 * @param {vscode.ExtensionContext} context
 */

const editor = vscode.window.activeTextEditor;

function provideGenerateButton(images) {
	return matches.map(match => new vscode.CodeLens(match.range, {
		title: 'Test Regex...',
		command: 'extension.toggleRegexPreview',
		arguments: [match]
	}));
}

async function generateImage() {
	if (editor) {
		const document = editor.document;
		const selection = editor.selection;
		const word = document.getText(selection);

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
			editBuilder.replace(selection, withAlt);
			console.log('Successfully added.');
		});
	}
}

function findImageLines(doc) {
	const matches = [];
	for (let i = 0; i < doc.lineCount; i++) {
		const line = doc.lineAt(i);
		let match = null;
		const regex = /<img[^>]*\/?>/g;
		regex.lastIndex = 0;
		const text = line.text.substr(0, 1000);
		console.log('#2##');
		while ((match = regex.exec(text))) {
			matches.push({
				doc: doc,
				match: match,
				range: new vscode.Range(i, match.index + 1, i, match.index + 1 + 1)
			})
		}
	}
	return matches;
}

/* async function findImages() {

	if (editor) {
		const document = editor.document;

		// Get the document text
		const documentText = document.getText();

		const images = documentText.match(/<img[^>]*\/?>/g);
		for (let i = 0; i < images.length; i++) {
			// TODO: put icon next to it
			console.log(images[i]);
		}
	}
} */

function toggleRegexPreview() {
	console.log('toggleRegexPreview');
}

function provideCodeLenses(doc, token) {
	const matches = findImageLines(doc);
	console.log(matches);
	return matches.map(match => new vscode.CodeLens(match.range, {
		title: 'Atakan Pappa...',
		command: 'extension.toggleRegexPreview',
		arguments: [match]
	}));
}

async function init() {
	// findImages();
	//provideCodeLenses();
	// generateImage();

	// vscode.window.showInformationMessage(response.data);
}

function activate(context) {
	console.log('Congratulations, your extension "generate-alt-text" is now active!');
	context.subscriptions.push(vscode.commands.registerCommand('extension.toggleRegexPreview', toggleRegexPreview));

	const languages = ['javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'vue', 'php', 'haxe'];
	languages.forEach(language => {
		context.subscriptions.push(vscode.languages.registerCodeLensProvider(language, { provideCodeLenses }));
	});


	let disposable = vscode.commands.registerCommand('generate-alt-text.generateAltText', function () {
		init();
	});

	context.subscriptions.push(disposable);
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
}
