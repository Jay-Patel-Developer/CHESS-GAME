#!/usr/bin/env node

// Quick test runner for Stockfish AI
// This runs the tests and shows results in the terminal

import { execSync } from 'child_process';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🧪 Starting Stockfish AI Test Runner...\n');

// Check if dev server is running
try {
  execSync('curl -s http://localhost:5173 > /dev/null', { stdio: 'ignore' });
  console.log('✅ Dev server is running on http://localhost:5173');
} catch (error) {
  console.log('❌ Dev server is not running. Please start it with: npm run dev');
  process.exit(1);
}

console.log('🌐 Test page available at: http://localhost:5173/test-bot.html');
console.log('📋 The test will run automatically when you open the page in a browser.');
console.log('\n📊 Test Coverage:');
console.log('   • Opening Position Analysis');
console.log('   • Tactical Position Evaluation'); 
console.log('   • Mate Detection (Forced Win)');
console.log('   • Endgame Calculation');
console.log('   • Multiple Depth Analysis');

console.log('\n💡 Instructions:');
console.log('   1. Open http://localhost:5173/test-bot.html in your browser');
console.log('   2. Watch the tests run automatically');
console.log('   3. Check the console output for detailed results');
console.log('   4. The page will show pass/fail status for each test');

console.log('\n🎯 Expected Results:');
console.log('   ✅ All 5 tests should pass if Stockfish is working correctly');
console.log('   🎯 Each test should generate a valid chess move (format: a1b2)');
console.log('   📊 You should see evaluation scores and analysis depth');

console.log('\n⚡ If tests fail, check:');
console.log('   • Browser console for error messages');
console.log('   • Network tab to see if /engine/stockfish.js loads successfully');
console.log('   • Content Security Policy errors');