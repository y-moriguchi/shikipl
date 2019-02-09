/*
 * shikipl
 *
 * Copyright (c) 2018 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */
var PREDEFINED_CONST = 1,
	POSTDEFINED_CONST = 2,
	undef = void 0;
var R = require("rena-js").clone();
R.ignoreDefault(/[ \t\n]+/);

function mergeObject(object, defaultObject) {
	var result = {},
		i;
	for(i in defaultObject) {
		if(defaultObject.hasOwnProperty(i)) {
			result[i] = defaultObject[i];
		}
	}
	for(i in object) {
		if(object.hasOwnProperty(i)) {
			result[i] = object[i];
		}
	}
	return result;
}

var alphabets = [
	'Alpha', 'alpha', 'Beta', 'beta', 'Gamma', 'gamma', 'Delta', 'delta',
	'Epsilon', 'epsilon', 'Zeta', 'zeta', 'Eta', 'eta', 'Theta', 'theta',
	'Iota', 'iota', 'Kappa', 'kappa', 'Lambda', 'lambda', 'Mu', 'mu',
	'Nu', 'nu', 'Xi', 'xi', 'Pi', 'pi', 'Rho', 'rho', 'Sigma', 'sigma',
	'Tau', 'tau', 'Upsilon', 'upsilon', 'Phi', 'phi', 'Chi', 'chi',
	'Psi', 'psi', 'Omega', 'omega'
];
function generateVariableName(alphabets) {
	var i,
		toApply = [];
	for(i = 0; i < alphabets.length; i++) {
		toApply.push(R.then("\\" + alphabets[i], function(x, b, a) { return x.substring(1); }));
	}
	toApply.push(R.then(/[a-zA-Z]/, function(x, b, a) { return x; }));
	return R.or.apply(null, toApply);
}

var ptnInteger = R.attr(0).thenOneOrMore(R.thenInt(/[0-9]/), function(x, b, a) { return a * 10 + b; });
var ptnNumber = R.then(ptnInteger).thenMaybe(R.then(".").then(ptnInteger), function(x, b, a) { return parseFloat(a + "." + b); });
var ptnVariableValue = R.then(generateVariableName(alphabets))
	.thenMaybe(R.or(
		R.then("^").then("\\prime", function(x, b, a) { return a + "Prime"; }),
		R.then("^").then("{").then("\\prime").then("\\prime").then("}", function(x, b, a) { return a + "PrimePrime"; })
	));

var ptnPoly = R.Yn(
	function(ptn, ptnWithoutSum, ptnTerm, ptnFirstTerm) {
		return R.then(R.then(ptnFirstTerm).thenZeroOrMore(
				R.or(
					R.then("+").then(ptnTerm, function(x, b, a) {
						return { env: a.env, val: a.val.concat([{ type: "term", num: b.num, vars: b.vars, sign: "+" }]) };
					}),
					R.then("-").then(ptnTerm, function(x, b, a) {
						return { env: a.env, val: a.val.concat([{ type: "term", num: b.num, vars: b.vars, sign: "-" }]) };
					}))))
			.action(function(x) { return { type: "poly", env: x.env, terms: x.val }; });
	},
	function(ptn, ptnWithoutSum, ptnTerm, ptnFirstTerm) {
		return R.then(R.then(ptnFirstTerm).thenZeroOrMore(
				R.or(
					R.then("+").lookaheadNot("\\sum").then(ptnTerm, function(x, b, a) {
						return { env: a.env, val: a.val.concat([{ type: "term", num: b.num, vars: b.vars, sign: "+" }]) };
					}),
					R.then("-").lookaheadNot("\\sum").then(ptnTerm, function(x, b, a) {
						return { env: a.env, val: a.val.concat([{ type: "term", num: b.num, vars: b.vars, sign: "-" }]) };
					}))))
			.action(function(x) { return { type: "poly", env: x.env, terms: x.val }; });
	},
	function(ptn, ptnWithoutSum, ptnTerm, ptnFirstTerm) {
		return R.Yn(
			function(ptnTerm) {
				function generateParen(left, right, action) {
					return R.then(left).then(ptn, action).then(right);
				}
				var ptnBracket = generateParen("{", "}");
				var ptnVariableSimple = R.then(ptnVariableValue, function(x, b, a) {
					var i,
						flag = false;
					for(i = 0; i < a.env.vars.length; i++) {
						if(a.env.vars[i] === b || a.env.vars[i].val === b) {
							flag = true;
							break;
						}
					}
					if(flag) {
						return { type: "var", env: a.env, variable: b };
					} else {
						throw new Error("unbound variable: " + b);
					}
				});
				var ptnVariable = R.then(ptnVariableSimple);
				var ptnNumberType = R.then(ptnNumber, function(x, b, a) { return { type: "num", env: a.env, number: b }; });
				var ptnSingle = R.action(function(x) { return { type: "num", env: x.env, number: 1 }; })
					.or(ptnBracket, ptnVariable, ptnNumberType);

				var ptnFrac = R.then("\\frac").then(ptnBracket, function(x, b, a) { return { env: a.env, val: b }; })
					.then(ptnBracket, function(x, b, a) { return { type: "frac", env: a.env, numer: a.val, denom: b }; });
				var ptnCall = R.then(ptnVariableValue, function(x, b, a) { return { env: a.env, func: b }; })
					.then(R.maybe("{"))
					.then(R.maybe("\\left"))
					.then("(")
					.then(R.then(ptn, function(x, b, a) { return { type: "call", env: a.env, func: a.func, args: [b] }; })
						.thenZeroOrMore(R.then(",").then(ptn, function(x, b, a) {
							return { type: "call", env: a.env, func: a.func, args: a.args.concat([b]) };
						})))
					.then(R.maybe("\\right"))
					.then(")")
					.then(R.maybe("}"));
				var ptnCallSub = R.then(ptnVariableValue, function(x, b, a) { return { env: a.env, func: b }; })
					.then("_")
					.then("{")
					.then(R.then(ptn, function(x, b, a) { return { type: "call", env: a.env, func: a.func, args: [b] }; })
						.thenZeroOrMore(R.then(",").then(ptn, function(x, b, a) {
							return { type: "call", env: a.env, func: a.func, args: a.args.concat([b]) };
						})))
					.then("}");
				var ptnRoot = R.then("\\sqrt")
					.then(R.maybe(R.then("[").then(ptn).then("]"), function(x, b, a) { return { env: a.env, nth: b }; }))
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
						}).then("}^").then(
							R.or(
								R.then(R.or(R.then("{").then("\\infty").then("}"), R.then("\\infty")), function(x, b, a) {
									return {
										type: "sum",
										env: a.env,
										countvar: a.countvar,
										start: a.start,
										end: {
											type: "infty"
										}
									};
								}),
								R.then(ptnSingle, function(x, b, a) {
									return {
										type: "sum",
										env: a.env,
										countvar: a.countvar,
										start: a.start,
										end: b
									};
								})
							)))
					.then(ptnWithoutSum, function(x, b, a) {
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

				function generateTriFuncHead(fname) {
					var func = R.then("\\" + fname).thenMaybe(R.then("^").then(ptnSingle));
					return R.or(R.then("{").then(func).then("}"), R.then(func));
				}
				var ptnLogHead = R.then(R.or(
					R.then("{").then("\\log").then(R.maybe(R.then("_").then(ptnSingle))).then("}"),
					R.then("\\log")));
				var ptnFunctionHead = R.or(
					generateTriFuncHead("sin"),
					generateTriFuncHead("cos"),
					generateTriFuncHead("tan"),
					ptnLogHead,
					R.then("\\ln"),
					R.then("\\exp"));

				return R.Yn(
					function(ptnTerm, ptnNoFunction) {
						var ptnFunctions = R.Y(function(ptnFunctions) {
							function generateTriFunc(fname) {
								var func = R.then("\\" + fname)
									.action(function(x) { return { type: "num", env: x.env, number: 1 }; })
									.thenMaybe(R.then("^").then(ptnSingle));
								return R.or(R.then("{").then(func).then("}"), func)
									.then(ptnFunctions, function(x, b, a) {
										return { type: "tri", fname: fname, env: a.env, pow: a, term: b };
									});
							}
							function generateInvTriFunc(fname) {
								var func = R.then("\\" + fname).then("^").then("{").then("-").then("1").then("}");
								return R.or(R.then("{").then(func).then("}"), func)
									.then(ptnFunctions, function(x, b, a) {
										return { type: "invtri", fname: fname, env: a.env, term: b };
									});
							}
							var ptnLog = R.then(R.or(
									R.then("{")
										.then("\\log")
										.then(R.maybe(R.then("_").then(ptnSingle), function(x, b, a) { return { env: a.env, base: b }; }))
										.then("}"),
									R.then("\\log")))
								.then(ptnFunctions, function(x, b, a) { return { type: "log", env: a.env, base: a.base, body: b }; });
							var ptnLn = R.then("\\ln")
								.then(ptnFunctions, function(x, b, a) { return { type: "log", env: a.env, base: null, body: b }; });
							var ptnExp = R.then("\\exp")
								.then(ptnFunctions, function(x, b, a) { return { type: "exp", env: a.env, base: null, body: b }; });

							return R.or(
								generateInvTriFunc("sin"),
								generateInvTriFunc("cos"),
								generateInvTriFunc("tan"),
								generateTriFunc("sin"),
								generateTriFunc("cos"),
								generateTriFunc("tan"),
								ptnLog,
								ptnLn,
								ptnExp,
								ptnNoFunction);
						});

						var ptnElement = R.or(
							ptnCall,
							ptnCallSub,
							ptnVariable,
							ptnFrac,
							ptnRoot,
							R.lookahead(ptnFunctionHead).then(ptnFunctions),
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

						var ptnAngle = R.then(ptnElement)
							.then(R.then("^").then(R.or(R.then(R.maybe("{")).then("o").then(R.maybe("}")), R.then("o"))), function(x, b, a) {
								return { type: "angle", env: a.env, body: a };
							});
						var ptnFactorial = R.then(ptnElement).then("!", function(x, b, a) {
								return { type: "factorial", env: a.env, body: a };
							});
						var ptnPower = R.then(ptnElement).thenMaybe(R.then("^").then(ptn), function(x, b, a) {
								return { type: "pow", env: a.env, pow: b, body: a };
							});
						var ptnVariables = R.zeroOrMore(R.or(ptnAngle, ptnFactorial, ptnPower), function(x, b, a) {
								return a.concat([b]);
							}, []);
						return R.then(R.attr(1).thenMaybe(ptnNumber), function(x, b, a) { return { env: a.env, val: b }; })
							.then(ptnVariables, function(x, b, a) { return { type: "term", env: a.env, num: a.val, vars: b }; });
					},
					function(ptnTerm, ptnNoFunction) {
						var ptnElement = R.lookaheadNot(ptnFunctionHead).or(
							ptnCall,
							ptnCallSub,
							ptnVariable,
							ptnFrac,
							ptnRoot,
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

						var ptnAngle = R.then(ptnElement)
							.then(R.then("^").then(R.or(R.then(R.maybe("{")).then("o").then(R.maybe("}")), R.then("o"))), function(x, b, a) {
								return { type: "angle", env: a.env, body: a };
							});
						var ptnFactorial = R.then(ptnElement).then("!", function(x, b, a) {
								return { type: "factorial", env: a.env, body: a };
							});
						var ptnPower = R.then(ptnElement).thenMaybe(R.then("^").then(ptnSingle), function(x, b, a) {
								return { type: "pow", env: a.env, pow: b, body: a };
							});
						var ptnVariables = R.zeroOrMore(R.or(ptnAngle, ptnFactorial, ptnPower), function(x, b, a) {
								return a.concat([b]);
							}, []);
						return R.then(R.attr(1).thenMaybe(ptnNumber), function(x, b, a) { return { env: a.env, val: b }; })
							.then(ptnVariables, function(x, b, a) { return { type: "term", env: a.env, num: a.val, vars: b }; });
					}
				);
			}
		);
	},
	function(ptn, ptnWithoutSum, ptnTerm, ptnFirstTerm) {
		return R.or(
			R.then("-").then(ptnTerm, function(x, b, a) {
				return { env: a.env, val: [{ type: "negate", env: a.env, body: b }] };
			}),
			R.then(ptnTerm, function(x, b, a) { return { env: a.env, val: [b] }; })
		);
	}
);

var ptnVariableArgs = R.delimit(R.or(ptnVariableValue, ptnNumber), ",", function(x, b, a) { return a.concat([b]); }, []);
var ptnSmallLeft = R.then(ptnVariableValue, function(x, b, a) { return { env: { func: b, vars: a.env.vars } }; })
	.then("(")
	.then(ptnVariableArgs, function(x, b, a) { return { env: { func: a.env.func, vars: a.env.vars.concat(b) } }; })
	.then(")");
var ptnBigLeft = R.then(ptnVariableValue, function(x, b, a) { return { env: { func: b, vars: a.env.vars } }; })
	.then(R.maybe("{"))
	.then("\\left(")
	.then(ptnVariableArgs, function(x, b, a) { return { env: { func: a.env.func, vars: a.env.vars.concat(b) } }; })
	.then("\\right)")
	.then(R.maybe("}"));
var ptnSubLeftBase = R.then("{").then(ptnVariableValue, function(x, b, a) { return { env: { func: b, vars: a.env.vars } }; })
	.then("_").then("{")
	.then(ptnVariableArgs, function(x, b, a) { return { env: { func: a.env.func, vars: a.env.vars.concat(b) } }; })
	.then("}").then("}");
var ptnSubLeft = R.or(R.then("{").then(ptnSubLeftBase).then("}"), ptnSubLeftBase);
var ptnConst = R.then(ptnVariableValue, function(x, b, a) { return { env: { func: b, vars: a.env.vars } }; });
var ptnLeft = R.or(ptnSmallLeft, ptnBigLeft, ptnSubLeft, ptnConst);

var ptn = R.then(ptnLeft).then("=").then(ptnPoly, function(x, b, a) { return { type: "func", left: a.env, right: b }; });

var actions = {
	"var": function(x, env) {
		return env.consts.indexOf(x.variable) < 0 ? x.variable : "(me." + x.variable + ")";
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
	"negate": function(x, env) {
		return "-(" + visit(x.body, env) + ")";
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
			res = "";
		for(i = 0; i < x.args.length; i++) {
			res += res ? "," : "(me." + x.func + ")(";
			res += visit(x.args[i], env);
		}
		return res + ")";
	},
	"tri": function(x, env) {
		var i,
			res = "";
		res += "(Math." + x.fname + "(" + visit(x.term, env) + ")";
		if(x.pow.type !== "num" || x.pow.number !== 1) {
			res += "**" + visit(x.pow, env);
		}
		return res + ")";
	},
	"invtri": function(x, env) {
		var i,
			res = "";
		res += "Math.a" + x.fname + "(" + visit(x.term, env) + ")";
		return res;
	},
	"pow": function(x, env) {
		var res = "";
		res += "(" + visit(x.body, env) + "**" + visit(x.pow, env) + ")";
		return res;
	},
	"angle": function(x, env) {
		var res = "";
		res += "((" + visit(x.body, env) + ") * " + (Math.PI / 180) + ")";
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
		var res = "",
			count = env.count;
		if(x.end.type === "infty") {
			env.count += 2;
			res += "(function (i" + count + ",i" + (count + 1) + "," + x.countvar + ") {";
			res += "for(" + x.countvar + "=" + visit(x.start, env) + ";true;" + x.countvar + "++){";
			res += "if(i" + (count + 1) + "!==false && Math.abs(i" + (count + 1) + "-i" + count + ")<" + env.epsilon + "){return i" + count + ";}";
			res += "i" + (count + 1) + "=i" + count + ";";
			res += "if(" + x.countvar + ">=" + env.iteration + "){ throw new Error('Series not converge'); }";
			res += "i" + count + "+=" + visit(x.body, env) + ";";
			res += "}";
			res += "})(0,false,0)";
		} else {
			env.count++;
			res += "(function (i" + count + "," + x.countvar + ") {";
			res += "for(" + x.countvar + "=" + visit(x.start, env) + ";" + x.countvar + "<=" + visit(x.end, env) + ";" + x.countvar + "++){";
			res += "i" + count + "+=" + visit(x.body, env) + ";";
			res += "}";
			res += " return i" + count + ";})(0,0)";
		}
		return res;
	},
	"factorial": function(x, env) {
		var res = "";
		res += "(function ($n,$r,$e) {";
		res += "$e=" + visit(x.body, env) + ";";
		res += "for($n=2;$n<=$e;$n++){$r = $r * $n;}";
		res += "return $r;})(0,1)";
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
			res = "";
		for(i = 0; i < x.left.vars.length; i++) {
			if(!x.left.vars[i].constFlag) {
				res += res ? "," : "function(";
				res += typeof x.left.vars[i] === "number" ? "_" + i : x.left.vars[i];
			}
		}
		res += (res ? "" : "function(") + ")\n{\treturn ";
		res += visit(x.right, env);
		res += ";\n}";
		return res;
	}
};

function visit(x, env) {
	return actions[x.type](x, env);
}

var defaultOption = {
	iteration: 10000,
	epsilon: 1e-15,
	consts: {
		e: Math.E,
		pi: Math.PI
	}
};

function generateToTeX(option /*, args*/) {
	var i,
		opt = mergeObject(option ? option : {}, defaultOption),
		consts = opt.consts,
		attrs = [],
		funcGroups = {},
		funcGroup,
		env,
		funcResult,
		inheritAttr,
		resultAttr;
	function getInitAttribute() {
		var i,
			result = [];
		for(i in consts) {
			if(consts.hasOwnProperty(i)) {
				result.push({
					constFlag: PREDEFINED_CONST,
					val: i
				});
			}
		}
		return {
			env: {
				vars: result
			}
		};
	}
	function generateConsts() {
		var i,
			result = "";
		for(i in consts) {
			if(consts.hasOwnProperty(i)) {
				result += result ? ",\n" : "(function() {\nvar me,\n";
				result += i + " = " + consts[i];
			}
		}
		return result + ";\nme = {";
	}
	function generateFuncGroups(name) {
		var j,
			k,
			argResult,
			funcResult,
			vars,
			cond,
			validNum = {};
		for(j = 0, argResult = ""; j < funcGroups[name][0].left.vars.length; j++) {
			if(!funcGroups[name][0].left.vars[j].constFlag) {
				if(argResult) {
					argResult += ",";
				}
				argResult += "a" + j;
				validNum[j] = true;
			}
		}
		if(argResult) {
			funcResult = "function(";
			funcResult += argResult + ") {";
			funcResult += "if(false) {} else "
			for(j = 0; j < funcGroups[name].length; j++) {
				vars = funcGroups[name][j].left.vars;
				cond = [];
				for(k = 0; k < vars.length; k++) {
					if(typeof vars[k] === "number") {
						cond[k] = vars[k];
					}
				}
				funcResult += "if(true";
				for(k = 0; k < cond.length; k++) {
					if(validNum[k] && cond[k] !== undef) {
						funcResult += " && a" + k + " === " + cond[k];
					}
				}
				funcResult += ") { return (";
				funcResult += visit(funcGroups[name][j], env);
				funcResult += ")(";
				for(k = 0, argResult = ""; k < vars.length; k++) {
					if(validNum[k]) {
						if(argResult) {
							argResult += ",";
						}
						argResult += cond[k] ? cond[k] : "a" + k;
					}
				}
				funcResult += argResult + ");} else ";
			}
			funcResult += "{ throw new Error('invalid arguments'); } }";
		} else {
			funcResult = "(" + visit(funcGroups[name][0], env) + ")()";
		}
		return funcResult;
	}
	function hasNotConstFlag(resultAttr) {
		var j;
		for(j = 0; j < resultAttr.left.vars.length; j++) {
			if(typeof resultAttr.left.vars[j] === "number" || !resultAttr.left.vars[j].constFlag) {
				return true;
			}
		}
		return false;
	}
	env = {
		count: 0,
		consts: [],
		iteration: opt.iteration,
		epsilon: opt.epsilon
	};
	inheritAttr = getInitAttribute();
	for(i = 1; i < arguments.length; i++) {
		resultAttr = ptn.parse(arguments[i], inheritAttr).attribute;
		attrs.push(resultAttr);
		if(!hasNotConstFlag(resultAttr)) {
			inheritAttr.env.vars.push({
				constFlag: POSTDEFINED_CONST,
				val: resultAttr.left.func
			});
			env.consts.push(resultAttr.left.func);
		}
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
	funcResult = "";
	for(i in funcGroups) {
		if(funcGroups.hasOwnProperty(i)) {
			funcResult += funcResult ? ",\n" : generateConsts();
			funcResult += i + ":";
			funcResult += generateFuncGroups(i);
		}
	}
	funcResult += "};\nreturn me;})();";
	return funcResult;
}

module.exports = generateToTeX;
