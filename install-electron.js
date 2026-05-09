const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const version = '41.1.1';
const platform = 'win32';
const arch = 'x64';
const mirror = 'https://npmmirror.com/mirrors/electron/';
const zipFileName = `electron-v${version}-${platform}-${arch}.zip`;
const downloadUrl = `${mirror}v${version}/${zipFileName}`;

const electronDir = path.join(__dirname, 'node_modules', 'electron');
const distDir = path.join(electronDir, 'dist');
const zipPath = path.join(electronDir, zipFileName);

console.log(`Downloading Electron ${version} from ${downloadUrl}`);

const protocol = downloadUrl.startsWith('https') ? https : http;
const request = protocol.get(downloadUrl, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to download: HTTP ${response.statusCode}`);
    process.exit(1);
  }

  const totalBytes = parseInt(response.headers['content-length'], 10);
  let downloadedBytes = 0;

  const file = fs.createWriteStream(zipPath);
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
  fs.unlink(zipPath, () => {});
  process.exit(1);
});

function extractZip() {
  const extract = require('extract-zip');
  
  console.log('Extracting...');
  
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  extract(zipPath, { dir: distDir })
    .then(() => {
      console.log('Extraction complete!');
      fs.writeFileSync(path.join(electronDir, 'path.txt'), 'electron.exe');
      console.log('Created path.txt');
      fs.unlinkSync(zipPath);
      console.log('Cleaned up zip file');
      console.log('Electron installed successfully!');
    })
    .catch((err) => {
      console.error(`Extraction error: ${err.message}`);
      process.exit(1);
    });
}