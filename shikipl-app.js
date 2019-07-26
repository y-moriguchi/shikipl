#!/usr/bin/env node
/*
 * shikipl
 *
 * Copyright (c) 2019 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */
var common,
    fs = require('fs'),
    Shiki = require("shikiml/shiki.js"),
    Tcalc = require("./tcalc.js"),
    prettyPrinter = require("./jsmetaflat-pp.js");

common = {
    version: "0.1.1"
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
    var toPrint = readFileToEnd(__dirname + "/usage.txt").replace("@version@", common.version);
    console.error(toPrint);
    process.exit(1);
}

function guessIndent(source) {
    var i,
        lines = source.split(/\n/),
        match,
        beforeIndent = null,
        indent = {};
    for(i = 0; i < lines.length; i++) {
        if(lines[i].charAt(0) === "    ") {
            return {
                indentChar: "    ",
                step: 1
            };
        } else if(!!(match = /^ +/.exec(lines[i]))) {
            if(beforeIndent === null) {
                beforeIndent = match[0].length;
            } else if(match[0].length > beforeIndent) {
                return {
                    indentChar: " ",
                    step: match[0].length - beforeIndent
                };
            }
        }
    }
    return {
        indentChar: " ",
        step: 4
    };
}

function processFile(file) {
    var match = /^(.*)\.js\.shikipl$/.exec(file),
        REPLACEREGEX = /(^|\n)([     ]*)((?:[^\n\\]|\\[^\n\[])*)\\\[((?:\\[^\]]|[^\\])+)\\\]/g,
        source,
        outFile,
        indent;
    if(!match) {
        console.error("invalid extension: " + file);
        process.exit(2);
    }
    source = readFileToEnd(file);
    indent = guessIndent(source);
    source = source.replace(REPLACEREGEX, function(match, nl, initialIndent, prefix, c1) {
        var i,
            formulae = c1.replace(/\r/g, "").split(/\n\n/),
            parsed,
            transformed = [null],
            resultComment,
            resultCode;
        resultComment = "\n" + initialIndent + "/*" + c1.replace(/\n/g, "\n" + initialIndent + " * ") + "*/\n" + initialIndent;
        for(i = 0; i < formulae.length; i++) {
            try {
                parsed = Shiki.parse(formulae[i]).replace(/\\\[ */, "").replace(/ *\\\]/, "").trim();
            } catch(e) {
                console.error("cannot parse formula: " + file);
                process.exit(2);
            }
            transformed.push(parsed);
        }
        try {
            resultCode = Tcalc.apply(null, transformed);
            resultCode = resultCode.replace(/;$/, "");
            resultCode = prettyPrinter(resultCode, {
                indentChar: indent.indentChar,
                step: indent.step,
                indent: 0,
                initialIndent: initialIndent
            });
        } catch(e) {
            console.error("unrecognized formula: " + file);
            process.exit(2);
        }
        return nl + initialIndent + prefix + resultComment + resultCode;
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
