/**
 * shikipl
 *
 * Copyright (c) 2018 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 **/
var shikipl = require("./shikipl.js");

function assertFloat(title, callback, expect, shikiProgram) {
	try {
		const program = shikipl(shikiProgram.trim());
		const resultFunction = (1,eval)(program);
		const actual = callback(resultFunction);
		if(actual === expect) {
			console.log(`passed: ${title}`);
		} else {
			console.log(`failed: ${title}: expect ${expect} but actual ${actual}`);
		}
	} catch(e) {
		console.log(`failed: ${title}: throw exception ${e.message}`);
	}
}

assertFloat("const", s => s.a, 27, `
a = 27
`);

assertFloat("addition", s => s.f(26), 27, `
f(a) = a + 1
`);

assertFloat("subscript argument", s => s.f(26), 27, `
f  = n + 1
 n
`);

assertFloat("Fibonacci series", s => s.F(10), 55, `
F  = 0
 0

F  = 1
 1

F  = F    + F
 n    n-2    n-1
`);
