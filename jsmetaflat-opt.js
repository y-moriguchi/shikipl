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
	}
];

function optimize(ast) {
	return A.scan(rules, ast);
}

module.exports = {
	optimize: optimize
};
