/**
 * shikipl
 *
 * Copyright (c) 2018 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 **/
var shikipl = require("./shikipl.js");
var black   = "\u001b[30m";
var red     = "\u001b[31m";
var green   = "\u001b[32m";
var yellow  = "\u001b[33m";
var blue    = "\u001b[34m";
var magenta = "\u001b[35m";
var cyan    = "\u001b[36m";
var white   = "\u001b[37m";
var reset   = "\u001b[0m";
var epsilon = 1e-13;

function assertFloat(title, callback, expect, shikiProgram) {
	try {
		const program = shikipl(shikiProgram.replace(/^\n/, ""));
		const resultFunction = (1,eval)(program);
		const actual = callback(resultFunction);
		if(Math.abs(actual - expect) < epsilon) {
			console.log(`pass: ${title}`);
		} else {
			console.log(`${red}fail: ${title}: expect ${expect} but actual ${actual}${reset}`);
		}
	} catch(e) {
		throw e;
		console.log(`${red}fail: ${title}: throw exception ${e.message}${reset}`);
	}
}

assertFloat("const", s => s.a, 27, `
a = 27
`);

assertFloat("addition", s => s.f(26), 27, `
f(a) = a + 1
`);

assertFloat("subtraction", s => s.f(28), 27, `
f(a) = a - 1
`);

assertFloat("multiplication", s => s.f(5), 10, `
f(a) = 2a
`);

assertFloat("priority 1", s => s.f(13), 27, `
f(a) = 2a + 1
`);

assertFloat("priority 2", s => s.f(13), 28, `
f(a) = 2(a + 1)
`);

assertFloat("fraction 1", s => s.f(28), 14, `
       a
f(a) = -
       2
`);

assertFloat("fraction 2", s => s.f(27), 14, `
        a+1
f(a) = -----
         2
`);

assertFloat("power 1", s => s.f(29), 841, `
        2
f(a) = a
`);

assertFloat("power 2", s => s.f(28), 841, `
            2
f(a) = (a+1)
`);

assertFloat("power 3", s => s.f(5), 50, `
         2
f(a) = 2a
`);

assertFloat("power 4", s => s.f(5), 100, `
           2
f(a) = (2a)
`);

assertFloat("square root 1", s => s.f(841), 29, `
        _
f(a) = va
`);

assertFloat("square root 2", s => s.f(840), 29, `
        ___
f(a) = va+1
`);

assertFloat("square root 3", s => s.f(841), 30, `
        _
f(a) = va+1
`);

assertFloat("square root 4", s => s.f(-29), 29, `
         __
        / 2
f(a) = v a
`);

assertFloat("sin 1", s => s.f(Math.PI / 2), 1, `
f(a) = sin a
`);

assertFloat("sin 2", s => s.f(0.5, 0.1, 0.2), Math.sin(0.5) * Math.sin(0.1) * Math.sin(0.2) * Math.sin(0.2), `
                            2
f(a, b, c) = sin a sin b sin  c
`);

assertFloat("cos", s => s.f(Math.PI / 2), 0, `
f(a) = cos a
`);

assertFloat("tan", s => s.f(Math.PI / 4), 1, `
f(a) = tan a
`);

assertFloat("arcsin", s => s.f(1), Math.PI / 2, `
          -1
f(a) = sin   a
`);

assertFloat("arccos", s => s.f(0), Math.PI / 2, `
          -1
f(a) = cos   a
`);

assertFloat("arctan", s => s.f(1), Math.PI / 4, `
          -1
f(a) = tan   a
`);

assertFloat("power of trigonometric function", s => s.f(8.765346283), 1, `
          2        2
f(a) = sin  a + cos  a
`);

assertFloat("subscript argument", s => s.f(26), 27, `
f  = n + 1
 n
`);

assertFloat("exp", s => s.f(1), Math.E, `
f(a) = exp a
`);

assertFloat("log 1", s => s.f(Math.E), 1, `
f(a) = log a
`);

assertFloat("log 2", s => s.f(Math.E), 1, `
f(a) = ln a
`);

assertFloat("log 3", s => s.f(128), 7, `
f(a) = log  a
          2
`);

assertFloat("a solution of quadratic equation", s => s.f(2, -4, 2), 1, `
                     ________
                    / 2
              -b + v b  - 4ac
f(a, b, c) = -----------------
                     2a
`);

assertFloat("haversine formula", s => s.d(3.046685, 3.146685, 100.686656, 101.686656), 69.2892623017496, `
r = 3956

                             ____________________________________________
                            /       o   o                         o   o
                      -1   /    2  B - b          o      o    2  L - l
d(B, b, L, l) = 2r sin    /  sin  -------- + cos B  cos b  sin  --------
                         v           2                             2
`);

assertFloat("Fibonacci series", s => s.F(10), 55, `
F  = 0
 0

F  = 1
 1

F  = F    + F
 n    n-2    n-1
`);
