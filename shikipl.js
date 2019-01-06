/**
 * shikipl
 *
 * Copyright (c) 2018 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 **/
var Shiki = require("shikiml/shiki.js"),
	Tcalc = require("./tcalc.js"),
	prettyPrinter = require("./jsmetaflat-pp.js");

function transform(formulaeString) {
	var i,
		parsed,
		formulae,
		transformed = [null],
		resultCode;
	formulae = formulaeString.split(/\n\n/);
	for(i = 0; i < formulae.length; i++) {
		parsed = Shiki.parse(formulae[i]).replace(/\\\[ */, "").replace(/ *\\\]/, "").trim();
		transformed.push(parsed);
	}
	resultCode = Tcalc.apply(null, transformed);
	resultCode = resultCode.replace(/;$/, "");
	resultCode = prettyPrinter(resultCode, {
		indentChar: " ",
		step: 4,
		indent: 0,
		initialIndent: ""
	});
	return resultCode;
}

module.exports = transform;
