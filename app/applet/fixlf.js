const fs = require('fs');
const file = 'src/App.tsx';
fs.writeFileSync(file, fs.readFileSync(file, 'utf-8').replace(/\r\n/g, '\n'));
console.log('Fixed LF');
