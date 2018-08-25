/*
 * shikipl
 *
 * Copyright (c) 2018 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */
var R = require("rena-js").clone();
R.ignoreDefault(/[ \t\n]+/);

var ptnSimpleVarName = R.then(/[a-zA-Z_][a-zA-Z0-9_]*/, function(x) { return x.trim(); });
var ptnVarName = R.delimit(ptnSimpleVarName, ".", function(x, b, a) { return a ? a + "." + b : b; }, "");
var ptnVarList = R.delimit(ptnVarName, ",", function(x, b, a) { return a.concat(b); }, []);

var ptnStringSq = R.then("'").then(/(?:[^\']|\\.)*/, function(x, b, a) { return "'" + x + "'"; }).then("'");
var ptnStringDq = R.then('"').then(/(?:[^\"]|\\.)*/, function(x, b, a) { return '"' + x + '"'; }).then('"');

var ptnExpr = R.Yn(function(ptnExpr, ptnExprList, ptnStmt, ptnStmtList) {
	var ptnDefinition = R.then("var")
		.then(R.delimit(
			R.then(ptnSimpleVarName, function(x, b, a) { return { type: "def", name: b }; })
				.thenMaybe(R.then("=").then(ptnExpr), function(x, b, a) { return { type: "def", name: a.name, init: b }; }),
			",",
			function(x, b, a) { return a.concat(b); },
			[]))
		.then(";");
	var ptnFunction = R.then("function")
		.then("(")
		.then(R.attr({ type: "function", args: [], defs: [] })
			.thenMaybe(ptnVarList, function(x, b, a) { return { type: "function", args: b, defs: [] }; }))
		.then(")")
		.then("{")
		.then(R.maybe(ptnDefinition, function(x, b, a) { return { type: "function", args: a.args, defs: b }; }))
		.then(ptnStmtList, function(x, b, a) { return { type: "function", args: a.args, defs: a.defs, body: b }; })
		.then("}");
	var ptnElement = R.or(
		R.then("(").then(ptnExpr).then(")"),
		R.real(),
		ptnStringSq,
		ptnStringDq,
		R.then("true", function() { return true; }),
		R.then("false", function() { return false; }),
		ptnFunction,
		R.then(ptnVarName, function(x, b, a) { return { type: "refer", name: b }; })
	);
	var ptnObject = R.Y(function(ptnObject) {
		return R.or(
			ptnElement,
			R.then("{")
				.then(R.delimit(
					R.then(ptnSimpleVarName).then(":").then(ptnExpr, function(x, b, a) { return { type: "keyValue", key: a, value: b }; }),
					",",
					function(x, b, a) { return a.concat(b); },
					[]))
				.then("}")
				.action(function(a) { return { type: "object", val: a }; })
		);
	});
	var ptnCall = R.then(ptnObject).thenMaybe(
		R.then("(").then(ptnExprList, function(x, b, a) { return { type: "call", callee: a, args: b }; }).then(")")
	);
	var ptnUnary = R.or(
		R.then("-").then(ptnCall, function(x, b, a) { return { type: "pre", body: b, op: "-" }; }),
		R.then("new").then(ptnCall, function(x, b, a) { return { type: "new", callee: b.callee, args: b.args }; }),
		ptnCall
	);
	var ptnPostfix = R.then(ptnUnary).thenMaybe(R.or(
		R.then("++", function(x, b, a) { return { type: "post", body: a, op: "++" }; })
	));
	var ptnExponent = R.then(ptnPostfix).thenZeroOrMore(
		R.then("**").then(ptnPostfix, function(x, b, a) { return { type: "pow", left: a, right: b }; })
	);
	var ptnFactor = R.Y(function(ptnFactor) {
		return R.then(ptnExponent).thenMaybe(R.or(
			R.then("*").then(ptnFactor, function(x, b, a) { return { type: "op", left: a, right: b, op: "*" }; }),
			R.then("/").then(ptnFactor, function(x, b, a) { return { type: "op", left: a, right: b, op: "/" }; })));
	});
	var ptnTerm = R.Y(function(ptnTerm) {
		return R.then(ptnFactor).thenMaybe(R.or(
			R.then("+").then(ptnTerm, function(x, b, a) { return { type: "op", left: a, right: b, op: "+" }; }),
			R.then("-").then(ptnTerm, function(x, b, a) { return { type: "op", left: a, right: b, op: "-" }; })));
	});
	var ptnCompare = R.Y(function(ptnCompare) {
		return R.then(ptnTerm).thenMaybe(R.or(
			R.then("<=").then(ptnCompare, function(x, b, a) { return { type: "op", left: a, right: b, op: "<=" }; })));
	});
	var ptnAssign = R.or(
		R.then(ptnVarName).thenOneOrMore(R.or(
			R.then("=").then(ptnCompare, function(x, b, a) { return { type: "op", left: a, right: b, op: "=" }; }),
			R.then("+=").then(ptnCompare, function(x, b, a) { return { type: "op", left: a, right: b, op: "+=" }; }))),
		R.then(ptnCompare)
	);
	return ptnAssign;
}, function(ptnExpr, ptnExprList, ptnStmt, ptnStmtList) {
	return R.attr([]).thenMaybe(R.delimit(ptnExpr, ",", function(x, b, a) { return a.concat(b); }, []));
}, function(ptnExpr, ptnExprList, ptnStmt, ptnStmtList) {
	var ptnIfElse = R.then("if")
		.then("(")
		.then(ptnExpr)
		.then(")")
		.then(ptnStmt, function(x, b, a) { return { type: "if", cond: a, bodyIf: b }; })
		.thenMaybe(
			R.then("else").then(ptnStmt, function(x, b, a) { return { type: "if", cond: a.cond, bodyIf: a.bodyIf, bodyElse: b }; }));
	var ptnThrow = R.then("throw").then(ptnExpr, function(x, b, a) { return { type: "throw", expr: b }; }).then(";");
	var ptnReturn = R.then("return").then(ptnExpr, function(x, b, a) { return { type: "return", expr: b }; }).then(";");
	var ptnBlock = R.then("{").then(ptnStmtList, function(x, b, a) { return { type: "block", stmts: b }; }).then("}");
	var ptnFor = R.then("for")
		.then("(")
		.then(ptnExpr)
		.then(";")
		.then(ptnExpr, function(x, b, a) { return { init: a, cond: b }; })
		.then(";")
		.then(ptnExpr, function(x, b, a) { return { init: a.init, cond: a.cond, step: b }; })
		.then(")")
		.then(ptnStmt, function(x, b, a) {
			return {
				type: "for",
				init: a.init,
				cond: a.cond,
				step: a.step,
				body: b
			};
		});
	return R.or(
		ptnBlock,
		ptnIfElse,
		ptnFor,
		ptnReturn,
		ptnThrow,
		R.then(ptnExpr).then(";", function(x, b, a) { return { type: "simpleexpr", expr: a }; })
	);
}, function(ptnExpr, ptnExprList, ptnStmt, ptnStmtList) {
	return R.zeroOrMore(R.then(ptnStmt), function(x, b, a) { return a.concat(b); }, []);
});

module.exports = function(input) {
	var result = ptnExpr.parse(input);
	if(result) {
		return result.attribute;
	} else {
		throw new Error("Syntax error");
	}
};
