#!/bin/bash
# Script to install gh-pages package

echo "Installing gh-pages package..."
npm install gh-pages --save-dev

echo "Verifying gh-pages installation..."
if [ -f "./node_modules/.bin/gh-pages" ]; then
  echo "✅ gh-pages successfully installed"
else
  echo "❌ gh-pages installation issue detected"
  echo "Trying alternative installation method..."
  npm install -g gh-pages
  echo "Please try running 'npm run deploy' again"
fi