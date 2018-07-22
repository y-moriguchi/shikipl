/**
 * shikipl
 *
 * Copyright (c) 2018 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 **/
var R = require("rena-js").clone();
R.ignore(/[ \t\n]+/);

var ptnInteger = R.attr(0).oneOrMore(R.thenInt(/[0-9]/), function(x, b, a) { return a * 10 + b; });
var ptnNumber = R.then(ptnInteger).maybe(R.then(".").then(ptnInteger), function(x, b, a) { return parseFloat(a + "." + b); });
var ptnVariableValue = R.then(/[a-zA-Z]/, function(x, b, a) { return x; });

var ptnPoly = R.Yn(
	function(ptn) {
		var ptnTerm = R.Yn(
			function(ptnTerm) {
				function generateParen(left, right, action) {
					return R.then(left).then(ptn, action).then(right);
				}
				var ptnBracket = generateParen("{", "}");
				var ptnVariable = R.then(ptnVariableValue, function(x, b, a) {
					if(a.env.vars.indexOf(b) < 0) {
						throw new Error("unbound variable: " + b);
					}
					return { type: "var", env: a.env, variable: b };
				});
				var ptnNumberType = R.then(ptnNumber, function(x, b, a) { return { type: "num", env: a.env, number: b }; });
				var ptnSingle = R.action(function(x) { return { type: "num", env: x.env, number: 1 }; })
					.or(ptnBracket, ptnVariable, ptnNumberType);

				var ptnFrac = R.then("\\frac").then(ptnBracket, function(x, b, a) { return { env: a.env, val: b }; })
					.then(ptnBracket, function(x, b, a) { return { type: "frac", env: a.env, numer: a.val, denom: b }; });
				function generateTriFunc(fname) {
					var func = R.then("\\" + fname)
						.action(function(x) { return { type: "num", env: x.env, number: 1 }; })
						.maybe(R.then("^").then(ptnSingle));
					return R.or(R.then(R.maybe("{")).then(func).maybe("}"), func)
						.then(ptnTerm, function(x, b, a) {
							return { type: "tri", fname: fname, env: a.env, pow: a, term: b };
						});
				}
				function generateInvTriFunc(fname) {
					var func = R.then("\\" + fname).then("^").then("{").then("-").then("1").then("}");
					return R.or(R.then(R.maybe("{")).then(func).maybe("}"), func)
						.then(ptnTerm, function(x, b, a) {
							return { type: "invtri", fname: fname, env: a.env, term: b };
						});
				}
				var ptnLog = R.then("\\log").then(
						R.maybe(R.then("_").then(ptnSingle), function(x, b, a) { return { env: a.env, base: b }; }))
					.then(ptnTerm, function(x, b, a) { return { type: "log", env: a.env, base: a.base, body: b }; });
				var ptnLn = R.then("\\ln")
					.then(ptnTerm, function(x, b, a) { return { type: "log", env: a.env, base: null, body: b }; });
				var ptnExp = R.then("\\exp")
					.then(ptnTerm, function(x, b, a) { return { type: "exp", env: a.env, base: null, body: b }; });
				var ptnCall = R.then(ptnVariableValue, function(x, b, a) { return { env: a.env, func: b }; })
					.then("(")
					.then(R.then(ptn, function(x, b, a) { return { type: "call", env: a.env, func: a.func, args: [b] }; })
						.zeroOrMore(R.then(",").then(ptn, function(x, b, a) {
							return { type: "call", env: a.env, func: a.func, args: a.args.concat([b]) };
						})))
					.then(")");
				var ptnRoot = R.then("\\sqrt").then(R.maybe(R.then("[").then(ptn).then("]"), function(x, b, a) { return { env: a.env, nth: b }; }))
					.then(ptnSingle, function(x, b, a) { return { type: "root", env: a.env, nth: a.nth, body: b }; });
				var ptnSumStart = R.then(ptnVariableValue, function(x, b, a) {
						return { env: a.env, countvar: b };
					}).then("=").then(ptn, function(x, b, a) { return { countvar: a.countvar, start: b }; });
				var ptnSum = R.then("\\sum").or(
						R.then("_{").then(ptnSumStart, function(x, b, a) {
							return {
								env: { func: a.env.func, vars: a.env.vars.concat([b.countvar]) },
								countvar: b.countvar,
								start: b.start
							};
						}).then("}^").then(ptnSingle, function(x, b, a) {
							return {
								type: "sum",
								env: a.env,
								countvar: a.countvar,
								start: a.start,
								end: b
							};
						}))
					.then(ptn, function(x, b, a) {
						return {
							type: "sum",
							env: a.env,
							countvar: a.countvar,
							start: a.start,
							end: a.end,
							body: b
						};
					});
				var ptnAbs = generateParen("|", "|", function(x, b, a) { return { type: "abs", env: a.env, body: b }; });
				var ptnBigAbs = generateParen("\\left|", "\\right|", function(x, b, a) { return { type: "abs", env: a.env, body: b }; });
				var ptnElement = R.or(
						ptnCall,
						ptnVariable,
						ptnFrac,
						ptnRoot,
						generateInvTriFunc("sin"),
						generateInvTriFunc("cos"),
						generateInvTriFunc("tan"),
						generateTriFunc("sin"),
						generateTriFunc("cos"),
						generateTriFunc("tan"),
						ptnLog,
						ptnLn,
						ptnExp,
						ptnSum,
						ptnBracket,
						generateParen("(", ")"),
						generateParen("\\{", "\\}"),
						generateParen("[", "]"),
						generateParen("\\left(", "\\right)"),
						generateParen("\\left\\{", "\\right\\}"),
						generateParen("\\left[", "\\right]"),
						ptnAbs,
						ptnBigAbs);

				var ptnPower = R.then(ptnElement).maybe(R.then("^").then(ptnSingle), function(x, b, a) {
						return { type: "pow", env: a.env, pow: b, body: a };
					});
				var ptnVariables = R.zeroOrMore(ptnPower, function(x, b, a) { return a.concat([b]); }, []);
				return R.then(R.attr(1).maybe(ptnNumber), function(x, b, a) { return { env: a.env, val: b }; })
					.then(ptnVariables, function(x, b, a) { return { type: "term", env: a.env, num: a.val, vars: b }; });
			}
		);
		return R.then(R.then(ptnTerm, function(x, b, a) { return { env: a.env, val: [b] }; }).zeroOrMore(
				R.or(
					R.then("+").then(ptnTerm, function(x, b, a) {
						return { env: a.env, val: a.val.concat([{ type: "term", num: b.num, vars: b.vars, sign: "+" }]) };
					}),
					R.then("-").then(ptnTerm, function(x, b, a) {
						return { env: a.env, val: a.val.concat([{ type: "term", num: b.num, vars: b.vars, sign: "-" }]) };
					}))))
			.action(function(x) { return { type: "poly", env: x.env, terms: x.val }; });
	}
);

var ptnVariableArgs = R.delimit(R.or(ptnVariableValue, ptnNumber), ",", function(x, b, a) { return a.concat([b]); }, []);
var ptnSmallLeft = R.then(ptnVariableValue, function(x, b, a) { return { env: { func: b } }; })
	.then("(")
	.then(ptnVariableArgs, function(x, b, a) { return { env: { func: a.env.func, vars: b } }; })
	.then(")");
var ptnBigLeft = R.then(ptnVariableValue, function(x, b, a) { return { env: { func: b } }; })
	.then(R.maybe("{"))
	.then("\\left(")
	.then(ptnVariableArgs, function(x, b, a) { return { env: { func: a.env.func, vars: b } }; })
	.then("\\right)")
	.then(R.maybe("}"));
var ptnLeft = R.or(ptnSmallLeft, ptnBigLeft);

var ptn = R.then(ptnLeft).then("=").then(ptnPoly, function(x, b, a) { return { type: "func", left: a.env, right: b }; });

var actions = {
	"var": function(x, env) {
		return x.variable;
	},
	"num": function(x, env) {
		return "(" + x.number + ")";
	},
	"frac": function(x, env) {
		return "(" + visit(x.numer, env) + ")/(" + visit(x.denom, env) + ")";
	},
	"term": function(x, env) {
		var i,
			res = x.num !== 1 ? x.num.toString() : "";
		for(i = 0; i < x.vars.length; i++) {
			if(res !== "") {
				res += "*";
			}
			res += visit(x.vars[i], env);
		}
		return res === "" ? "1" : res;
	},
	"poly": function(x, env) {
		var i,
			res = "";
		for(i = 0; i < x.terms.length; i++) {
			if(i > 0) {
				res += x.terms[i].sign;
			}
			res += "(" + visit(x.terms[i], env) + ")";
		}
		return res;
	},
	"call": function(x, env) {
		var i,
			res = x.func + "(";
		for(i = 0; i < x.args.length; i++) {
			if(i > 0) {
				res += ",";
			}
			res += visit(x.args[i], env);
		}
		return res + ")";
	},
	"tri": function(x, env) {
		var i,
			res = "";
		if(x.pow.type !== "num" || x.pow.number !== 1) {
			res += "Math.pow(";
		}
		res += "Math." + x.fname + "(" + visit(x.term, env) + ")";
		if(x.pow.type !== "num" || x.pow.number !== 1) {
			res += "," + visit(x.pow, env) + ")";
		}
		return res;
	},
	"invtri": function(x, env) {
		var i,
			res = "";
		res += "Math.a" + x.fname + "(" + visit(x.term, env) + ")";
		return res;
	},
	"pow": function(x, env) {
		var res = "";
		res += "Math.pow(" + visit(x.body, env) + "," + visit(x.pow, env) + ")";
		return res;
	},
	"root": function(x, env) {
		var res = "";
		if(x.nth) {
			res += "Math.pow(" + visit(x.body, env) + ",1/" + visit(x.nth, env) + ")";
		} else {
			res += "Math.sqrt(" + visit(x.body, env) + ")";
		}
		return res;
	},
	"sum": function(x, env) {
		var res = "";
		res += "(function () { var i" + env.count + "=0;";
		res += "for(var " + x.countvar + "=" + visit(x.start, env) + ";" + x.countvar + "<=" + visit(x.end, env) + ";" + x.countvar + "++){";
		res += "i" + env.count + "+=" + visit(x.body, env);
		res += "} return i" + env.count + ";})()";
		env.count++;
		return res;
	},
	"abs": function(x, env) {
		return "Math.abs(" + visit(x.body, env) + ")";
	},
	"log": function(x, env) {
		var res = "(Math.log(" + visit(x.body, env) + ")";
		if(x.base) {
			res += "/Math.log(" + visit(x.base, env) + ")";
		}
		return res + ")";
	},
	"exp": function(x, env) {
		return "Math.exp(" + visit(x.body, env) + ")";
	},
	"func": function(x, env) {
		var i,
			res = "function ";
		res += "(";
		for(i = 0; i < x.left.vars.length; i++) {
			if(i > 0) {
				res += ",";
			}
			res += typeof x.left.vars[i] === "number" ? "_" + i : x.left.vars[i];
		}
		res += ")\n{\treturn ";
		res += visit(x.right, env);
		res += ";\n}";
		return res;
	}
};

function visit(x, env) {
	return actions[x.type](x, env);
}

function evalTeX(/*args*/) {
	var i,
		j,
		k,
		attrs = [],
		funcGroups = {},
		funcResult,
		funcGroup,
		vars,
		cond,
		env = { count: 0 },
		result = {};
	for(i = 0; i < arguments.length; i++) {
		attrs.push(ptn.parse(arguments[i]).attribute);
	}
	for(i = 0; i < attrs.length; i++) {
		funcGroup = funcGroups[attrs[i].left.func];
		if(!funcGroup) {
			funcGroup = [attrs[i]];
			funcGroups[attrs[i].left.func] = funcGroup;
		} else if(funcGroup[0].left.vars.length !== attrs[i].left.vars.length) {
			throw new Error("length of arguments is not same");
		} else {
			funcGroup.push(attrs[i]);
		}
	}
	for(i in funcGroups) {
		if(funcGroups.hasOwnProperty(i)) {
			funcResult = "(function " + i + "(";
			for(j = 0; j < funcGroups[i][0].left.vars.length; j++) {
				if(j > 0) {
					funcResult += ",";
				}
				funcResult += "a" + j;
			}
			funcResult += ") {";
			funcResult += "if(false) {} else "
			for(j = 0; j < funcGroups[i].length; j++) {
				vars = funcGroups[i][j].left.vars;
				cond = [];
				for(k = 0; k < vars.length; k++) {
					if(typeof vars[k] === "number") {
						cond[k] = vars[k];
					}
				}
				funcResult += "if(true";
				for(k = 0; k < cond.length; k++) {
					if(cond[k]) {
						funcResult += " && a" + k + " === " + cond[k];
					}
				}
				funcResult += ") { return (";
				funcResult += visit(funcGroups[i][j], env);
				funcResult += ")(";
				for(k = 0; k < vars.length; k++) {
					if(k > 0) {
						funcResult += ",";
					}
					funcResult += cond[k] ? cond[k] : "a" + k;
				}
				funcResult += ");} else ";
			}
			funcResult += "{ throw new Error('invalid arguments') } })";
			result[i] = (1,eval)(funcResult);
		}
	}
	return result;
}

module.exports = evalTeX;
