/*
 * shikipl
 *
 * Copyright (c) 2018 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */
var A = require("astraia");

var rules = [
	{
		pattern: {
			type: "op",
			op: "&&",
			left: A.eqv(true)
		},
		action: function(obj) {
			return obj.right;
		}
	},
	{
		pattern: {
			type: "op",
			op: "||",
			left: A.eqv(false)
		},
		action: function(obj) {
			return obj.right;
		}
	},
	{
		pattern: {
			type: "if",
			cond: A.eqv(false),
			bodyElse: A.any
		},
		action: function(obj) {
			return obj.bodyElse;
		}
	},
	{
		pattern: {
			type: "if",
			cond: A.eqv(true),
			bodyElse: {
				type: "block"
			}
		},
		action: function(obj) {
			return obj.bodyIf;
		}
	},
	{
		pattern: {
			type: "function",
			body: [{
				type: "block"
			}]
		},
		action: function(obj) {
			return {
				type: "function",
				args: obj.args,
				defs: obj.defs,
				body: obj.body[0].stmts
			};
		}
	},
	{
		pattern: {
			type: "return",
			expr: {
				type: "call",
				callee: {
					type: "function",
					body: [{
						type: "return",
						expr: A.number
					}]
				}
			}
		},
		action: function(obj) {
			return obj.expr.callee.body[0];
		}
	}
];

function optimize(ast) {
	return A.scan(rules, ast);
}

module.exports = {
	optimize: optimize
};
