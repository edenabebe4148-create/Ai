const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../dist');
const destDir = path.join(__dirname, '../android/app/src/main/assets/www');

if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}
fs.mkdirSync(destDir, { recursive: true });

fs.cpSync(srcDir, destDir, { recursive: true });

const htmlFile = path.join(destDir, 'index.html');
if (fs.existsSync(htmlFile)) {
  const content = fs.readFileSync(htmlFile, 'utf8').replace(/\bcrossorigin\b/g, '');
  fs.writeFileSync(htmlFile, content);
}

console.log('Successfully copied dist assets to android/app/src/main/assets/www');
