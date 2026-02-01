#!/bin/bash

# Clean previous build
rm -rf .next
rm -rf .next-standalone

# Build the application
NODE_ENV=production npm run build

# Create standalone directory
mkdir -p .next-standalone
mkdir -p .next-standalone/.next

# Copy necessary files
cp -r .next/standalone/* .next-standalone/
cp -r .next/static .next-standalone/.next/
cp -r .next/server .next-standalone/.next/
cp -r .next/types .next-standalone/.next/
cp -r .next/cache .next-standalone/.next/
cp -r .next/*.* .next-standalone/.next/
cp -r public .next-standalone/

# Start the server
cd .next-standalone
NODE_ENV=production PORT=3000 node server.js 