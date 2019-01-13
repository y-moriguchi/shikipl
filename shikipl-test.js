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

assertFloat("unary minus", s => s.f(-26), 27, `
f(a) = -a + 1
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

assertFloat("power 5", s => s.f(2), 32, `
        2a+1
f(a) = a
`);

assertFloat("power 6", s => s.f(2), 8, `
         2
        a - 1
f(a) = a
`);

assertFloat("power 7", s => s.f(4), 9, `
        1
        - + 1
        2
f(a) = a      + 1
`);

assertFloat("angle", s => s.f(1), Math.PI / 180, `
        o
f(a) = a
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

assertFloat("builtin const 1", s => s.a, Math.exp(2), `
     2
a = e
`);

assertFloat("builtin const 2", s => s.a, 2 * Math.PI, `
a = 2π
`);

assertFloat("absolute value 1", s => s.f(-1), 1, `
f(a) = |a|
`);

assertFloat("absolute value 2", s => s.f(-1), 3, `
f(a) = |2a - 1|
`);

assertFloat("sin 1", s => s.f(Math.PI / 2), 1, `
f(a) = sin a
`);

assertFloat("sin 2", s => s.f(0.5, 0.1, 0.2), Math.sin(0.5) * Math.sin(0.1) * Math.sin(0.2) * Math.sin(0.2), `
                            2
f(a, b, c) = sin a sin b sin  c
`);

assertFloat("sin 3", s => s.f(Math.PI / 2), 0, `
                π
f(a) = sin (a + --)
                 2
`);

assertFloat("sin 4", s => s.f(90), 1, `
           π
f(a) = sin ---a
           180
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

assertFloat("function call 1", s => s.f(128), 14, `
g(a) = log  a
          2

f(a) = 2g(a)
`);

assertFloat("function call 1", s => s.f(128), 14, `
g(a) = log  a
          2

f(a) = 2g
         a
`);

assertFloat("sum 1", s => s.f(2), 110, `
          10
       ---
f(a) =  >       an
       ---
          n = 1
`);

assertFloat("sum 2", s => s.f(2), 2*(1 + 4 + 9), `
          3
       ---        2
f(a) =  >       an
       ---
          n = 1
`);

function sum3(a, n) {
	var result = 0, i;
	for(i = 1; i <= 3; i++) {
		result += a * Math.sin(a);
	}
	return result;
}
assertFloat("sum 3", s => s.f(2), sum3(2, 3), `
          3
       ---
f(a) =  >       a sin a
       ---
          n = 1
`);

function sum4(a, n) {
	var result = 0, i;
	for(i = 1; i <= 3; i++) {
		result += Math.sin(a) + Math.cos(a);
	}
	return result;
}
assertFloat("sum 4", s => s.f(2), sum4(2, 3), `
          3
       ---
f(a) =  >       sin a + cos a
       ---
          n = 1
`);

assertFloat("a solution of quadratic equation", s => s.f(2, -4, 2), 1, `
                     ________
                    / 2
              -b + v b  - 4ac
f(a, b, c) = -----------------
                     2a
`);

assertFloat("spherical Mercator projection", s => s.y(27), 0.48971537442745056, `
                     o
               π   b
y(b) = ln tan (-- + --)
                4   2
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

assertFloat("Ackermann function 1", s => s.A(3,3), 61, `
A    = n+1
 0,n

A    = A
 m,0    m-1,1

A    = A
 m,n    m-1,A
             m,n-1
`);

assertFloat("Ackermann function 2", s => s.A(3,3), 61, `
A(0,n) = n+1

A(m,0) = A(m-1,1)

A(m,n) = A(m-1,A(m,n-1))
`);

assertFloat("mixed test 1", s => s.y(27), 1.48971537442745056, `
                     o
               π   b
y(b) = ln tan (-- + --) + 1
                4   2
`);
