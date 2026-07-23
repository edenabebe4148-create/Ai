const fs = require('fs');
const path = require('path');

const logoSrc = path.join(__dirname, '../src/assets/images/logowhite.png');
const resDir = path.join(__dirname, '../android/app/src/main/res');

const mipmapFolders = [
  'mipmap-hdpi',
  'mipmap-mdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi'
];

if (fs.existsSync(logoSrc)) {
  mipmapFolders.forEach((folder) => {
    const targetFolder = path.join(resDir, folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }
    fs.copyFileSync(logoSrc, path.join(targetFolder, 'ic_launcher.png'));
    fs.copyFileSync(logoSrc, path.join(targetFolder, 'ic_launcher_foreground.png'));
    fs.copyFileSync(logoSrc, path.join(targetFolder, 'ic_launcher_round.png'));
  });
  console.log('Successfully updated Android launcher icons in mipmap folders!');
} else {
  console.error('Logo source image not found at', logoSrc);
}
