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
        try {
            parsed = Shiki.parse(formulae[i]).replace(/\\\[ */, "").replace(/ *\\\]/, "").trim();
        } catch(e) {
            throw new Error("cannot parse formula");
        }
        transformed.push(parsed);
    }
    try {
        resultCode = Tcalc.apply(null, transformed);
        resultCode = resultCode.replace(/;$/, "");
        resultCode = prettyPrinter(resultCode, {
            indentChar: " ",
            step: 4,
            indent: 0,
            initialIndent: ""
        });
    } catch(e) {
        throw new Error("unrecognized formula");
    }
    return resultCode;
}

module.exports = transform;
