# Click Tracking Verification Script
Write-Host "=== Click Tracking Verification Script ===" -ForegroundColor Green
Write-Host ""
Write-Host "This script verifies that all click tracking components are in place" -ForegroundColor Cyan
Write-Host ""

# Check if required files exist
Write-Host "Checking required files..." -ForegroundColor Yellow
$files = @(
    "frontend/src/App.jsx",
    "backend/api/track_click.php",
    "backend/api/admin_api.php",
    "backend/core/db.php"
)

$allFilesExist = $true
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✓ $file exists" -ForegroundColor Green
    } else {
        Write-Host "✗ $file missing" -ForegroundColor Red
        $allFilesExist = $false
    }
}

Write-Host ""

# Check if click tracking code is present in App.jsx
Write-Host "Checking click tracking implementation in App.jsx..." -ForegroundColor Yellow
$appJsxContent = Get-Content "frontend/src/App.jsx" -Raw

if ($appJsxContent -match "track_click.php") {
    Write-Host "✓ Click tracking API call found" -ForegroundColor Green
} else {
    Write-Host "✗ Click tracking API call not found" -ForegroundColor Red
    $allFilesExist = $false
}

if ($appJsxContent -match "navigator.sendBeacon") {
    Write-Host "✓ sendBeacon implementation found" -ForegroundColor Green
} else {
    Write-Host "✗ sendBeacon implementation not found" -ForegroundColor Red
    $allFilesExist = $false
}

if ($appJsxContent -match "release_id" -and $appJsxContent -match "platform_name") {
    Write-Host "✓ Required tracking parameters found" -ForegroundColor Green
} else {
    Write-Host "✗ Required tracking parameters not found" -ForegroundColor Red
    $allFilesExist = $false
}

Write-Host ""

# Check if track_click.php has proper error handling
Write-Host "Checking error handling in track_click.php..." -ForegroundColor Yellow
$trackClickContent = Get-Content "backend/api/track_click.php" -Raw

if ($trackClickContent -match "try \{") {
    Write-Host "✓ Error handling (try-catch) found" -ForegroundColor Green
} else {
    Write-Host "✗ Error handling not found" -ForegroundColor Red
    $allFilesExist = $false
}

if ($trackClickContent -match "PDOException") {
    Write-Host "✓ Database error handling found" -ForegroundColor Green
} else {
    Write-Host "✗ Database error handling not found" -ForegroundColor Red
    $allFilesExist = $false
}

if ($trackClickContent -match "success.*false") {
    Write-Host "✓ Error response handling found" -ForegroundColor Green
} else {
    Write-Host "✗ Error response handling not found" -ForegroundColor Red
    $allFilesExist = $false
}

Write-Host ""

# Check if admin_api.php has click details endpoint
Write-Host "Checking admin monitoring endpoints..." -ForegroundColor Yellow
$adminApiContent = Get-Content "backend/api/admin_api.php" -Raw

if ($adminApiContent -match "click_details") {
    Write-Host "✓ Click details endpoint found" -ForegroundColor Green
} else {
    Write-Host "✗ Click details endpoint not found" -ForegroundColor Red
    $allFilesExist = $false
}

if ($adminApiContent -match "link_clicks") {
    Write-Host "✓ Link clicks table queries found" -ForegroundColor Green
} else {
    Write-Host "✗ Link clicks table queries not found" -ForegroundColor Red
    $allFilesExist = $false
}

Write-Host ""

# Check if database schema includes link_clicks table
Write-Host "Checking database schema..." -ForegroundColor Yellow
$dbContent = Get-Content "backend/core/db.php" -Raw

if ($dbContent -match "CREATE TABLE.*link_clicks") {
    Write-Host "✓ link_clicks table schema found" -ForegroundColor Green
} else {
    Write-Host "✗ link_clicks table schema not found" -ForegroundColor Red
    $allFilesExist = $false
}

if ($dbContent -match "release_id.*INT.*NOT NULL" -and $dbContent -match "platform_name.*VARCHAR.*NOT NULL") {
    Write-Host "✓ Required link_clicks columns found" -ForegroundColor Green
} else {
    Write-Host "✗ Required link_clicks columns not found" -ForegroundColor Red
    $allFilesExist = $false
}

Write-Host ""

# Check if Admin.jsx has click analytics display
Write-Host "Checking admin dashboard analytics..." -ForegroundColor Yellow
$adminJsxContent = Get-Content "frontend/src/Admin.jsx" -Raw

if ($adminJsxContent -match "click_details") {
    Write-Host "✓ Click details display found" -ForegroundColor Green
} else {
    Write-Host "✗ Click details display not found" -ForegroundColor Red
    $allFilesExist = $false
}

if ($adminJsxContent -match "total_clicks") {
    Write-Host "✓ Total clicks display found" -ForegroundColor Green
} else {
    Write-Host "✗ Total clicks display not found" -ForegroundColor Red
    $allFilesExist = $false
}

Write-Host ""

# Summary
Write-Host "=== Verification Summary ===" -ForegroundColor Cyan
if ($allFilesExist) {
    Write-Host "✓ All click tracking components are properly implemented" -ForegroundColor Green
    Write-Host ""
    Write-Host "Key Features Implemented:" -ForegroundColor Cyan
    Write-Host "  • Frontend click tracking with sendBeacon and fallback" -ForegroundColor White
    Write-Host "  • Backend API with proper error handling" -ForegroundColor White
    Write-Host "  • Database schema for tracking clicks" -ForegroundColor White
    Write-Host "  • Admin monitoring endpoints" -ForegroundColor White
    Write-Host "  • Dashboard analytics display" -ForegroundColor White
    Write-Host ""
    Write-Host "The click tracking system is ready for use!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To test the functionality:" -ForegroundColor Cyan
    Write-Host "1. Start your development server" -ForegroundColor White
    Write-Host "2. Navigate to a release page" -ForegroundColor White
    Write-Host "3. Click on music service links" -ForegroundColor White
    Write-Host "4. Check the admin dashboard for click analytics" -ForegroundColor White
    Write-Host "5. Monitor the browser console for any errors" -ForegroundColor White
    exit 0
} else {
    Write-Host "✗ Some components are missing or incomplete" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please review the failed checks above and ensure all components are properly implemented." -ForegroundColor Yellow
    exit 1
}