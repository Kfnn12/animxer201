const fs = require('fs');
let code = fs.readFileSync('/app/applet/src/App.tsx', 'utf-8');
let index = code.indexOf('Episodes List in Watch View');
let snippet = code.substring(index - 20, index + 500);
console.log(JSON.stringify(snippet));
