const { basename, extname, join } = require('path');
const { compile } = require('svelte');
const { getOptions } = require('loader-utils');
const { statSync, utimesSync, writeFileSync } = require('fs');
const { tmpdir } = require('os');

function sanitize(input) {
	return basename(input)
		.replace(extname(input), '')
		.replace(/[^a-zA-Z_$0-9]+/g, '_')
		.replace(/^_/, '')
		.replace(/_$/, '')
		.replace(/^(\d)/, '_$1');
}

function capitalize(str) {
	return str[0].toUpperCase() + str.slice(1);
}

module.exports = function(source, map) {
	this.cacheable();

	const options = getOptions(this) || {};

	options.filename = this.resourcePath;
	options.format = this.version === 1 ? options.format || 'cjs' : 'es';
	options.shared =
		options.format === 'es' && require.resolve('svelte/shared.js');

	if (options.emitCss) options.css = false;

	if (!options.name) options.name = capitalize(sanitize(options.filename));

	try {
		let { code, map, css, cssMap, ast } = compile(source, options);

		if (options.emitCss && css) {
			const tmpFile = join(tmpdir(), 'svelte-' + ast.hash + '.css');

			css += '\n/*# sourceMappingURL=' + cssMap.toUrl() + '*/';
			code = code + `\nrequire('${tmpFile}');\n`;

			writeFileSync(tmpFile, css);
			const stats = statSync(tmpFile);
			utimesSync(tmpFile, stats.atimeMs - 9999, stats.mtimeMs - 9999);
		}

		this.callback(null, code, map);
	} catch (err) {
		// wrap error to provide correct
		// context when logging to console
		this.callback(new Error(err.toString() + '\n' + err.frame));
	}
};
