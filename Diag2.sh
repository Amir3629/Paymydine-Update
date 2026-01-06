#!/bin/bash

echo "=== Fixing Next.js Server ==="
echo ""

echo "1. Checking PM2 status..."
pm2 list
echo ""

echo "2. Checking if port 3001 is in use..."
if command -v netstat &> /dev/null; then
    netstat -tuln | grep :3001 || echo "    Port 3001 not in use"
elif command -v ss &> /dev/null; then
    ss -tuln | grep :3001 || echo "    Port 3001 not in use"
fi
echo ""


echo "3. Recent PM2 logs (last 20 lines)..."
pm2 logs paymydine-frontend --lines 20 --nostream 2>/dev/null || echo "    Cannot get logs"
echo ""


echo "4. Restarting PM2 process..."
pm2 stop paymydine-frontend 2>/dev/null
sleep 2

FRONTEND_DIR="/var/www/paymydine/frontend"
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "    Frontend directory not found at $FRONTEND_DIR"
    exit 1
fi

cd "$FRONTEND_DIR"
echo "    Working directory: $(pwd)"

# Delete and restart
pm2 delete paymydine-frontend 2>/dev/null
pm2 start npm --name "paymydine-frontend" --cwd "$(pwd)" -- run preview

echo ""
echo "5. Waiting 5 seconds for server to start..."
sleep 5

echo ""
echo "6. Testing Next.js server..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ 2>&1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "    Next.js server is now responding (HTTP $HTTP_CODE)"
else
    echo "    Next.js server still not responding (HTTP $HTTP_CODE)"
    echo ""
    echo "   Check logs: pm2 logs paymydine-frontend"
    echo "   Check if process is running: pm2 list"
fi

echo ""
echo "=== Complete ==="
