/**
 * shikipl
 *
 * Copyright (c) 2018 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 **/
var Shiki = require("shikiml/shiki.js"),
	Tcalc = require("./tcalc.js");

function parse(/*args*/) {
	var i,
		parsed,
		transformed = [null];
	for(i = 0; i < arguments.length; i++) {
		parsed = Shiki.parse(arguments[i]).replace(/\\\[ */, "").replace(/ *\\\]/, "").trim();
		console.log(parsed);
		transformed.push(parsed);
	}
	return (1,eval)(Tcalc.apply(null, transformed));
}

module.exports = parse;
