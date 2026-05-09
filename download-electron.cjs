const fs = require('fs');
const path = require('path');
const https = require('https');

const url = 'https://github.com/electron/electron/releases/download/v41.1.1/electron-v41.1.1-win32-x64.zip';
const outputPath = path.join(__dirname, 'electron.zip');
const electronDir = path.join(__dirname, 'node_modules', 'electron');
const distDir = path.join(electronDir, 'dist');

console.log(`Downloading Electron from: ${url}`);

const file = fs.createWriteStream(outputPath);
const request = https.get(url, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to download: HTTP ${response.statusCode}`);
    process.exit(1);
  }
  
  const totalBytes = parseInt(response.headers['content-length'], 10);
  let downloadedBytes = 0;
  
  response.pipe(file);
  
  response.on('data', (chunk) => {
    downloadedBytes += chunk.length;
    const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
    process.stdout.write(`\rDownloading: ${percent}% (${(downloadedBytes / 1024 / 1024).toFixed(2)} MB)`);
  });
  
  file.on('finish', () => {
    file.close(() => {
      console.log('\nDownload complete!');
      extractZip();
    });
  });
});

request.on('error', (err) => {
  console.error(`Download error: ${err.message}`);
  fs.unlink(outputPath, () => {});
  process.exit(1);
});

function extractZip() {
  const extract = require('extract-zip');
  
  console.log('Extracting...');
  
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  extract(outputPath, { dir: distDir })
    .then(() => {
      console.log('Extraction complete!');
      fs.writeFileSync(path.join(electronDir, 'path.txt'), 'electron.exe');
      console.log('Created path.txt');
      console.log('Electron installed successfully!');
    })
    .catch((err) => {
      console.error(`Extraction error: ${err.message}`);
      process.exit(1);
    });
}