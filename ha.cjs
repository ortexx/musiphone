const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, 'package.json');
const packageJson = require(file);
packageJson.type = 'module';
fs.writeFileSync(file, JSON.stringify(packageJson, null, 2));