"use strict";
var path = require('path');
var shell = require('shelljs');
//------------------------------------------------------------------------------
// shell functions
//------------------------------------------------------------------------------
var shellAssert = function () {
    var errMsg = shell.error();
    if (errMsg) {
        throw new Error(errMsg);
    }
};
var cp = function (options, source, dest) {
    if (dest) {
        shell.cp(options, source, dest);
    }
    else {
        shell.cp(options, source);
    }
    shellAssert();
};
var mkdir = function (options, target) {
    if (target) {
        shell.mkdir(options, target);
    }
    else {
        shell.mkdir(options);
    }
    shellAssert();
};

mkdir("-p", path.join(__dirname, 'out/configure/templates'));
cp("-Rf", path.join(__dirname, 'src/configure/templates/*'), path.join(__dirname, 'out/configure/templates'));
//# sourceMappingURL=copyStaticFiles.js.map
