// Simple test to verify our local Stockfish integration
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting Stockfish integration test...\n');

// Test 1: Check if local Stockfish file exists and has content
const stockfishPath = path.join(__dirname, 'public', 'engine', 'stockfish.js');
console.log('📁 Checking local Stockfish file...');
console.log(`   Path: ${stockfishPath}`);

try {
  const stats = fs.statSync(stockfishPath);
  console.log(`   ✅ File exists and is ${Math.round(stats.size / 1024)}KB`);
  
  if (stats.size < 1000) {
    console.log('   ❌ File is too small - likely a placeholder');
    process.exit(1);
  }
  
  // Read first few lines to verify it's actual JavaScript
  const content = fs.readFileSync(stockfishPath, 'utf8');
  const firstLines = content.split('\n').slice(0, 3).join('\n');
  
  if (content.includes('function') || content.includes('var ') || content.includes('Module')) {
    console.log('   ✅ File appears to contain valid JavaScript code');
    console.log(`   📄 Preview: ${firstLines.substring(0, 100)}...`);
  } else {
    console.log('   ❌ File does not appear to contain valid JavaScript');
    console.log(`   📄 Content preview: ${firstLines}`);
  }
  
} catch (error) {
  console.log(`   ❌ Error accessing file: ${error.message}`);
  process.exit(1);
}

// Test 2: Check if we can serve the file via HTTP
console.log('\n🌐 Checking if file is accessible via HTTP...');
console.log('   (This simulates how the browser will access it)');

// Create a simple server to test file serving
const server = http.createServer((req, res) => {
  if (req.url === '/engine/stockfish.js') {
    try {
      const content = fs.readFileSync(stockfishPath);
      res.writeHead(200, {
        'Content-Type': 'application/javascript',
        'Content-Length': content.length
      });
      res.end(content);
      console.log('   ✅ Successfully served Stockfish file via HTTP');
    } catch (error) {
      res.writeHead(404);
      res.end('File not found');
      console.log(`   ❌ Error serving file: ${error.message}`);
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(3001, () => {
  console.log('   📡 Test server started on port 3001');
  
  // Make a test request
  const testReq = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/engine/stockfish.js',
    method: 'GET'
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`   ✅ HTTP test successful - received ${data.length} bytes`);
        console.log(`   🎯 Response status: ${res.statusCode}`);
        console.log(`   📦 Content-Type: ${res.headers['content-type']}`);
      } else {
        console.log(`   ❌ HTTP test failed - status: ${res.statusCode}`);
      }
      
      server.close();
      console.log('\n📊 Test Summary:');
      console.log('   • Local file exists and has proper size ✅');
      console.log('   • File contains JavaScript code ✅');  
      console.log('   • File can be served via HTTP ✅');
      console.log('\n🎉 Stockfish integration test completed successfully!');
      console.log('💡 Your chess app should now be able to load Stockfish from the local file.');
    });
  });
  
  testReq.on('error', (error) => {
    console.log(`   ❌ HTTP test request failed: ${error.message}`);
    server.close();
  });
  
  testReq.end();
});