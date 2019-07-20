import { createFilter } from 'rollup-pluginutils';
import MagicString from 'magic-string';
import { OLSKInternationalInputDataIsTranslationFileBasename, OLSKInternationalLanguageIDForTranslationFileBasename } from 'OLSKInternational';
import globPackage from 'glob';
import pathPackage from 'path';
import jsYAMLPackage from 'js-yaml';

const OLSKRollupI18NExtractOLSKLocalizedIdentifiers = function(inputData) {
	let match = (inputData || '').match(/OLSKLocalized\([\'\"](\w+)[\'\"]\)/g);

	if (!match) {
		return [];
	}

	return match.map(function (e) {
		return e.replace('OLSKLocalized', '').replace(/\W/g, '');
	});
};
const OLSKRollupI18NInternationalizationToken = 'JSON.parse(`{"PLUGIN_ALFA_SEARCH_REPLACE":"PLUGIN_ALFA_SEARCH_REPLACE"}`)';

const OLSKRollupI18NReplaceInternationalizationToken = function(param1, param2) {
	if (typeof param1 !== 'object' || param1 === null) {
		throw new Error('OLSKErrorInputInvalid');
	}

	if (typeof param1.code !== 'string') {
		throw new Error('OLSKErrorInputInvalid');
	}

	if (typeof param2 !== 'object' || param2 === null) {
		throw new Error('OLSKErrorInputInvalid');
	}

	let startIndex = param1.code.indexOf(OLSKRollupI18NInternationalizationToken);

	if (startIndex === -1) return param1;

	let magicString = new MagicString(param1.code);

	magicString.overwrite(startIndex, startIndex + OLSKRollupI18NInternationalizationToken.length, `JSON.parse(\`${ JSON.stringify(param2).replace(/`/g, '\\\`') }\`)`);

	return Object.assign(param1, {
		code: magicString.toString(),
	}, param1.map ? {
		map: magicString.generateMap(),
	} : {});
};

function i18nPlugin( options = {} ) {
  const filter = createFilter( options.include, options.exclude );
  const sourceMap = options.sourceMap !== false;

  const baseDirectory = options.baseDirectory;
  let matchedContstants = [];

  return {
		name: 'i18n',

		transform(code, id) {
			if (id.match('node_modules')) {
				return null;
			}

			if (!filter(id)) {
				return null;
			}
			
			OLSKRollupI18NExtractOLSKLocalizedIdentifiers(code).forEach(function (e) {
				if (matchedContstants.indexOf(e) !== -1) {
					return;
				}

				matchedContstants.push(e);
			});

			return null;
		},

		renderChunk(code, chunk, options) {
			if (!baseDirectory) {
				throw new Error('missing options.baseDirectory');
			}

			return OLSKRollupI18NReplaceInternationalizationToken({
				code: code,
				map: sourceMap,
			}, globPackage.sync('*i18n*.y*(a)ml', {
			  matchBase: true,
			  cwd: baseDirectory,
			}).filter(function(e) {
			  return OLSKInternationalInputDataIsTranslationFileBasename(pathPackage.basename(e));
			}).reduce(function(coll, item) {
				let languageID = OLSKInternationalLanguageIDForTranslationFileBasename(pathPackage.basename(item));
				let allTranslations = jsYAMLPackage.safeLoad(require('fs').readFileSync(pathPackage.join(baseDirectory, item), 'utf8'));

				return (coll[languageID] = Object.assign(coll[languageID] || {}, matchedContstants.reduce(function (coll, item) {
					if (!allTranslations[item]) {
						return coll;
					}
					return (coll[item] = allTranslations[item]) && coll;
				}, {}))) && coll;
			}, {}));
					
		},
  };
}

export default i18nPlugin;
