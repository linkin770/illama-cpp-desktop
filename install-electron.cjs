const { downloadArtifact } = require('@electron/get');
const extract = require('extract-zip');
const fs = require('fs');
const path = require('path');

const electronDir = path.join(__dirname, 'node_modules', 'electron');
const distDir = path.join(electronDir, 'dist');
const pathFile = path.join(electronDir, 'path.txt');

async function installElectron() {
  console.log('Starting Electron installation...');
  
  try {
    // Download Electron
    console.log('Downloading Electron 41.1.1...');
    const zipPath = await downloadArtifact({
      version: '41.1.1',
      artifactName: 'electron',
      platform: 'win32',
      arch: 'x64',
      mirror: 'https://npmmirror.com/mirrors/electron/'
    });
    console.log(`Downloaded to: ${zipPath}`);
    
    // Create dist directory
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
      console.log(`Created dist directory: ${distDir}`);
    }
    
    // Extract zip
    console.log('Extracting...');
    await extract(zipPath, { dir: distDir });
    console.log('Extraction complete');
    
    // Write path.txt
    fs.writeFileSync(pathFile, 'electron.exe');
    console.log(`Created path.txt: ${pathFile}`);
    
    // Verify
    const electronExe = path.join(distDir, 'electron.exe');
    if (fs.existsSync(electronExe)) {
      console.log(`SUCCESS: Electron installed to ${electronExe}`);
    } else {
      console.log(`ERROR: electron.exe not found at ${electronExe}`);
    }
    
  } catch (err) {
    console.error('Error installing Electron:', err);
    process.exit(1);
  }
}

installElectron();