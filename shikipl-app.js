/*
 * shikipl
 *
 * Copyright (c) 2018 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */
var common,
    fs = require('fs'),
	Shiki = require("shikiml/shiki.js"),
	Tcalc = require("./tcalc.js");

common = {
    version: "0.0.0"
};

function readFileToEnd(file) {
	if(!file) {
		console.error('No file is specified');
		process.exit(2);
	}
	try {
		return fs.readFileSync(file, 'utf8');
	} catch(err) {
		console.error('File %s can not read', file);
		process.exit(2);
	}
}

function printUsage() {
    var toPrint = readFileToEnd("./usage.txt").replace("@version@", common.version);
    console.error(toPrint);
    process.exit(1);
}

function processFile(file) {
    var match = /^(.*)\.js\.shikipl+$/.exec(file),
        source,
        outFile;
    if(!match) {
        console.error("invalid extension: " + file);
        process.exit(2);
    }
    source = readFileToEnd(file);
    source = source.replace(/\\\[((?:\\[^\]]|[^\\])+)\\\]/g, function(match, c1) {
        var i,
            formulae = c1.split(/\n\n/),
            parsed,
    		transformed = [null],
    		result;
    	result = "\n/*" + c1 + "*/\n"
        for(i = 0; i < formulae.length; i++) {
            parsed = Shiki.parse(c1).replace(/\\\[ */, "").replace(/ *\\\]/, "").trim();
            transformed.push(parsed);
        }
        return result + Tcalc.apply(null, transformed);
    });
    outFile = file.replace(/\.js\.shikipl$/, ".js");
    fs.writeFileSync(outFile, source);
}

function main() {
    var i;
    if(process.argv.length <= 2) {
        printUsage();
    } else {
        for(i = 2; i < process.argv.length; i++) {
            processFile(process.argv[i]);
        }
    }
}
main();
