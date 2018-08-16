/*
 * shikipl
 *
 * Copyright (c) 2018 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */
var undef = void 0,
	jsmfParser = require("./jsmetaflat-parser.js");

function join(args, delimiter, output) {
	var i,
		result = "";
	for(i = 0; i < args.length; i++) {
		if(i > 0) {
			result += delimiter;
		}
		result += prettyPrinter(args[i], output);
	}
	return result;
}

function strTimes(str, num) {
	var i,
		result = "";
	for(i = 0; i < num; i++) {
		result += str;
	}
	return result;
}

function printerOutput(indent, step) {
	var ind = indent ? indent * step : 0,
		buf = strTimes(" ", indent),
		me;
	me = {
		print: function(str) {
			buf += str;
		},
		println: function(str, indent) {
			ind = indent ? ind + indent * step : ind;
			me.print(str);
			buf += "\n";
			buf += strTimes(" ", ind);
		},
		toString: function() {
			return buf;
		}
	};
	return me;
}

function printDef(def, output) {
	output.print(def.name);
	if(def.init !== undef) {
		output.print(" = " + def.init);
	}
}

function prettyPrinter(parsed, output) {
	var i;
	if(typeof parsed !== "object") {
		output.print("" + parsed);
		return;
	}
	switch(parsed.type) {
	case "function":
		output.print("function(");
		join(parsed.args, ", ", output);
		output.println(") {", 1);
		if(parsed.defs.length > 0) {
			output.print("var ");
			printDef(parsed.defs[0], output);
			if(parsed.defs.length > 1) {
				for(i = 1; i < parsed.defs.length; i++) {
					output.println(",", i > 1 ? 0 : 1);
					printDef(parsed.defs[i], output);
				}
				output.println(";", -1);
			} else {
				output.println(";", 0);
			}
		}
		for(i = 0; i < parsed.body.length; i++) {
			if(i > 0) {
				output.println("");
			}
			prettyPrinter(parsed.body[i], output);
		}
		output.println("", -1);
		output.print("}");
		break;
	case "refer":
		output.print(parsed.name);
		break;
	case "object":
		if(parsed.val.length > 0) {
			output.println("{", 1);
			for(i = 0; i < parsed.val.length; i++) {
				if(i > 0) {
					output.println(",");
				}
				output.print(parsed.val[i].key + ": ");
				prettyPrinter(parsed.val[i].value, output);
			}
			output.println("", -1);
			output.print("}");
		} else {
			output.print("{}");
		}
		break;
	case "new":
		output.print("new ");
		/* fall */
	case "call":
		if(parsed.callee.type === "function") {
			output.print("(");
			prettyPrinter(parsed.callee, output);
			output.print(")");
		} else {
			prettyPrinter(parsed.callee, output);
		}
		output.print("(");
		join(parsed.args, ", ", output);
		output.print(")");
		break;
	case "uminus":
		output.print("-");
		prettyPrinter(parsed.body, output);
		break;
	case "mul":
		prettyPrinter(parsed.left, output);
		output.print(" * ");
		prettyPrinter(parsed.right, output);
		break;
	case "div":
		prettyPrinter(parsed.left, output);
		output.print(" / ");
		prettyPrinter(parsed.right, output);
		break;
	case "add":
		prettyPrinter(parsed.left, output);
		output.print(" + ");
		prettyPrinter(parsed.right, output);
		break;
	case "sub":
		prettyPrinter(parsed.left, output);
		output.print(" - ");
		prettyPrinter(parsed.right, output);
		break;
	case "assign":
		prettyPrinter(parsed.left, output);
		output.print(" = ");
		prettyPrinter(parsed.right, output);
		break;
	case "if":
		output.print("if(");
		prettyPrinter(parsed.cond, output);
		if(parsed.bodyIf.type === "block") {
			if(parsed.bodyIf.stmts.length > 0) {
				output.println(") {", 1);
				for(i = 0; i < parsed.bodyIf.stmts.length; i++) {
					if(i > 0) {
						output.println("");
					}
					prettyPrinter(parsed.bodyIf.stmts[i], output);
				}
				output.println("", -1);
			} else {
				output.println(") {");
			}
			if(parsed.bodyElse) {
				output.print("} else ");
				if(parsed.bodyElse.type === "block") {
					output.println("{", 1);
					for(i = 0; i < parsed.bodyElse.stmts.length; i++) {
						if(i > 0) {
							output.println("");
						}
						prettyPrinter(parsed.bodyElse.stmts[i], output);
					}
					output.println("", -1);
					output.print("}");
				} else {
					prettyPrinter(parsed.bodyElse, output);
				}
			} else {
				output.println("}");
			}
		}
		break;
	case "throw":
		output.print("throw ");
		prettyPrinter(parsed.expr, output);
		output.print(";");
		break;
	case "return":
		output.print("return ");
		prettyPrinter(parsed.expr, output);
		output.print(";");
		break;
	case "block":
		output.println("{", 1);
		for(i = 0; i < parsed.stmts.length; i++) {
			prettyPrinter(parsed.stmts[i], output);
			output.println("");
		}
		output.print("}", -1);
		break;
	case "simpleexpr":
		prettyPrinter(parsed.expr, output);
		output.print(";");
		break;
	}
}

function prettyPrint(input, option) {
	var parsed = jsmfParser(input),
		opt = option ? option : {},
		indent = opt.indent ? opt.indent : 0,
		step = opt.step ? opt.step : 4,
		output = printerOutput(indent, step);
	prettyPrinter(parsed, output);
	return output.toString();
}

module.exports = prettyPrint;
