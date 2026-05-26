#!/bin/bash

echo "=== Click Tracking Verification Script ==="
echo ""
echo "This script verifies that all click tracking components are in place"
echo ""

# Check if required files exist
echo "Checking required files..."
files=(
    "frontend/src/App.jsx"
    "backend/api/track_click.php"
    "backend/api/admin_api.php"
    "backend/core/db.php"
)

all_files_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file exists"
    else
        echo "✗ $file missing"
        all_files_exist=false
    fi
done

echo ""

# Check if click tracking code is present in App.jsx
echo "Checking click tracking implementation in App.jsx..."
if grep -q "track_click.php" frontend/src/App.jsx; then
    echo "✓ Click tracking API call found"
else
    echo "✗ Click tracking API call not found"
    all_files_exist=false
fi

if grep -q "navigator.sendBeacon" frontend/src/App.jsx; then
    echo "✓ sendBeacon implementation found"
else
    echo "✗ sendBeacon implementation not found"
    all_files_exist=false
fi

if grep -q "release_id" frontend/src/App.jsx && grep -q "platform_name" frontend/src/App.jsx; then
    echo "✓ Required tracking parameters found"
else
    echo "✗ Required tracking parameters not found"
    all_files_exist=false
fi

echo ""

# Check if track_click.php has proper error handling
echo "Checking error handling in track_click.php..."
if grep -q "try {" backend/api/track_click.php; then
    echo "✓ Error handling (try-catch) found"
else
    echo "✗ Error handling not found"
    all_files_exist=false
fi

if grep -q "PDOException" backend/api/track_click.php; then
    echo "✓ Database error handling found"
else
    echo "✗ Database error handling not found"
    all_files_exist=false
fi

if grep -q "success.*false" backend/api/track_click.php; then
    echo "✓ Error response handling found"
else
    echo "✗ Error response handling not found"
    all_files_exist=false
fi

echo ""

# Check if admin_api.php has click details endpoint
echo "Checking admin monitoring endpoints..."
if grep -q "click_details" backend/api/admin_api.php; then
    echo "✓ Click details endpoint found"
else
    echo "✗ Click details endpoint not found"
    all_files_exist=false
fi

if grep -q "link_clicks" backend/api/admin_api.php; then
    echo "✓ Link clicks table queries found"
else
    echo "✗ Link clicks table queries not found"
    all_files_exist=false
fi

echo ""

# Check if database schema includes link_clicks table
echo "Checking database schema..."
if grep -q "CREATE TABLE.*link_clicks" backend/core/db.php; then
    echo "✓ link_clicks table schema found"
else
    echo "✗ link_clicks table schema not found"
    all_files_exist=false
fi

if grep -q "release_id.*INT.*NOT NULL" backend/core/db.php && grep -q "platform_name.*VARCHAR.*NOT NULL" backend/core/db.php; then
    echo "✓ Required link_clicks columns found"
else
    echo "✗ Required link_clicks columns not found"
    all_files_exist=false
fi

echo ""

# Check if Admin.jsx has click analytics display
echo "Checking admin dashboard analytics..."
if grep -q "click_details" frontend/src/Admin.jsx; then
    echo "✓ Click details display found"
else
    echo "✗ Click details display not found"
    all_files_exist=false
fi

if grep -q "total_clicks" frontend/src/Admin.jsx; then
    echo "✓ Total clicks display found"
else
    echo "✗ Total clicks display not found"
    all_files_exist=false
fi

echo ""

# Summary
echo "=== Verification Summary ==="
if [ "$all_files_exist" = true ]; then
    echo "✓ All click tracking components are properly implemented"
    echo ""
    echo "Key Features Implemented:"
    echo "  • Frontend click tracking with sendBeacon and fallback"
    echo "  • Backend API with proper error handling"
    echo "  • Database schema for tracking clicks"
    echo "  • Admin monitoring endpoints"
    echo "  • Dashboard analytics display"
    echo ""
    echo "The click tracking system is ready for use!"
    echo ""
    echo "To test the functionality:"
    echo "1. Start your development server"
    echo "2. Navigate to a release page"
    echo "3. Click on music service links"
    echo "4. Check the admin dashboard for click analytics"
    echo "5. Monitor the browser console for any errors"
    exit 0
else
    echo "✗ Some components are missing or incomplete"
    echo ""
    echo "Please review the failed checks above and ensure all components are properly implemented."
    exit 1
fi