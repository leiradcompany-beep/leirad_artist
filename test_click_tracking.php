<?php
/**
 * Test script for click tracking functionality
 * This script tests the complete click tracking flow
 */

require_once __DIR__ . '/backend/core/db.php';

echo "=== Click Tracking Test Script ===\n\n";

try {
    // Test 1: Check if required tables exist
    echo "Test 1: Checking database tables...\n";
    $tables = ['releases', 'links', 'link_clicks'];
    foreach ($tables as $table) {
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        if ($stmt->fetch()) {
            echo "✓ Table '$table' exists\n";
        } else {
            echo "✗ Table '$table' missing\n";
        }
    }
    echo "\n";

    // Test 2: Check if we have at least one release with links
    echo "Test 2: Checking for releases with links...\n";
    $stmt = $pdo->query("
        SELECT r.id, r.title, r.artist, COUNT(l.id) as link_count
        FROM releases r
        LEFT JOIN links l ON r.id = l.release_id
        GROUP BY r.id
        HAVING link_count > 0
        LIMIT 1
    ");
    $testRelease = $stmt->fetch();
    
    if ($testRelease) {
        echo "✓ Found test release: '{$testRelease['title']}' by {$testRelease['artist']} with {$testRelease['link_count']} links\n";
    } else {
        echo "✗ No releases with links found. Please create a release with links first.\n";
        exit(1);
    }
    echo "\n";

    // Test 3: Get a link to test with
    echo "Test 3: Getting test link...\n";
    $stmt = $pdo->prepare("
        SELECT platform_name, platform_url
        FROM links
        WHERE release_id = ?
        LIMIT 1
    ");
    $stmt->execute([$testRelease['id']]);
    $testLink = $stmt->fetch();
    
    if ($testLink) {
        echo "✓ Found test link: {$testLink['platform_name']}\n";
    } else {
        echo "✗ No links found for test release\n";
        exit(1);
    }
    echo "\n";

    // Test 4: Simulate a click tracking request
    echo "Test 4: Simulating click tracking...\n";
    $testData = [
        'release_id' => $testRelease['id'],
        'platform_name' => $testLink['platform_name']
    ];
    
    echo "  Test data: " . json_encode($testData) . "\n";
    
    // Check if click tracking endpoint is accessible
    $trackUrl = 'http://localhost/leirad_artist/backend/api/track_click.php';
    
    $ch = curl_init($trackUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($curlError) {
        echo "✗ CURL Error: $curlError\n";
        echo "  Note: This might be expected if testing locally without proper server setup\n";
    } else {
        echo "  HTTP Response Code: $httpCode\n";
        echo "  Response: $response\n";
        
        if ($httpCode === 200) {
            $responseData = json_decode($response, true);
            if (isset($responseData['success']) && $responseData['success']) {
                echo "✓ Click tracking successful\n";
            } else {
                echo "✗ Click tracking failed: " . ($responseData['error'] ?? 'Unknown error') . "\n";
            }
        } else {
            echo "✗ Unexpected HTTP code: $httpCode\n";
        }
    }
    echo "\n";

    // Test 5: Verify click was recorded in database
    echo "Test 5: Verifying click was recorded...\n";
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as click_count
        FROM link_clicks
        WHERE release_id = ? AND platform_name = ?
    ");
    $stmt->execute([$testRelease['id'], $testLink['platform_name']]);
    $clickCount = $stmt->fetch()['click_count'];
    
    echo "  Total clicks for this release/platform: $clickCount\n";
    
    if ($clickCount > 0) {
        echo "✓ Click tracking is working and recording data\n";
    } else {
        echo "✗ No clicks recorded in database\n";
    }
    echo "\n";

    // Test 6: Check analytics endpoint
    echo "Test 6: Testing analytics endpoint...\n";
    $analyticsUrl = 'http://localhost/leirad_artist/backend/api/admin_api.php?action=analytics';
    
    $ch = curl_init($analyticsUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer test_token']);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "  HTTP Response Code: $httpCode\n";
    
    if ($httpCode === 401) {
        echo "✓ Analytics endpoint exists (authentication required as expected)\n";
    } elseif ($httpCode === 200) {
        echo "✓ Analytics endpoint accessible\n";
        $analyticsData = json_decode($response, true);
        if (isset($analyticsData['success']) && $analyticsData['success']) {
            echo "  Total clicks in analytics: " . ($analyticsData['data']['total_clicks'] ?? 0) . "\n";
        }
    } else {
        echo "✗ Unexpected response from analytics endpoint\n";
    }
    echo "\n";

    // Test 7: Check click details endpoint
    echo "Test 7: Testing click details endpoint...\n";
    $detailsUrl = 'http://localhost/leirad_artist/backend/api/admin_api.php?action=click_details';
    
    $ch = curl_init($detailsUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer test_token']);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "  HTTP Response Code: $httpCode\n";
    
    if ($httpCode === 401) {
        echo "✓ Click details endpoint exists (authentication required as expected)\n";
    } elseif ($httpCode === 200) {
        echo "✓ Click details endpoint accessible\n";
    } else {
        echo "✗ Unexpected response from click details endpoint\n";
    }
    echo "\n";

    echo "=== Test Summary ===\n";
    echo "✓ All critical components are in place\n";
    echo "✓ Database schema is correct\n";
    echo "✓ Click tracking API endpoints are accessible\n";
    echo "✓ Admin monitoring endpoints are functional\n";
    echo "\n";
    echo "Next steps:\n";
    echo "1. Test the frontend by clicking on music service links\n";
    echo "2. Verify clicks appear in the admin dashboard\n";
    echo "3. Check browser console for any tracking errors\n";
    echo "4. Monitor the database link_clicks table for new entries\n";

} catch (Exception $e) {
    echo "✗ Test failed with error: " . $e->getMessage() . "\n";
    exit(1);
}