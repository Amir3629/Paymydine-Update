echo "=== IMAGE DIAGNOSTIC QUICK CHECK ==="
echo ""

# Check if we're in the right directory
if [ ! -d "assets/media/attachments/public" ]; then
    echo " Error: assets/media/attachments/public directory not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo "1. Checking file structure..."
ls -la assets/media/attachments/public/ | head -10
echo ""

echo "2. Searching for sample image files..."
echo "Looking for: 6978c2491b364221182244"
find assets/media/attachments/public -name "*6978c2491b364221182244*" 2>/dev/null
if [ $? -ne 0 ]; then
    echo " File not found!"
else
    echo " File found!"
fi
echo ""

echo "3. Checking directory permissions..."
ls -ld assets/media/attachments/public/
echo ""

echo "4. Testing API endpoint..."
curl -s http://mimoza.paymydine.com/api/v1/menu | jq -r '.data.items[0] | "Menu: \(.name)\nImage URL: \(.image)"' 2>/dev/null || echo " API test failed or jq not installed"
echo ""

echo "5. Testing media route..."
curl -I http://mimoza.paymydine.com/api/media/6978c2491b364221182244 2>/dev/null | head -1
echo ""

echo "=== DONE ==="
echo ""
echo "If files are missing, you may need to:"
echo "  1. Re-upload images through admin panel"
echo "  2. Check file permissions"
echo "  3. Check Laravel logs: tail -f storage/logs/laravel.log"
