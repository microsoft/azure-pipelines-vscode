var fs = require('fs');
var path = require('path');

var binPath = path.join(__dirname, 'out/credentialstore/bin');
if (!fs.existsSync(binPath)) {
    fs.mkdirSync(binPath);
}

var binWin32Path = path.join(__dirname, 'out/credentialstore/bin/win32');
if (!fs.existsSync(binWin32Path)) {
    fs.mkdirSync(binWin32Path);
}

var src = path.join(__dirname, 'src/credentialstore/bin/win32/creds.exe');
var dest = path.join(__dirname, 'out/credentialstore/bin/win32/creds.exe');

//console.log(src);
//console.log(dest);

fs.copyFile(src, dest, (err) => {
    if (err) throw err;
});
