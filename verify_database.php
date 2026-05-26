<?php
/**
 * Database Connection and Table Verification Script
 * This script verifies that the database connection and link_clicks table are properly configured
 */

echo "=== Database Verification Script ===\n\n";

try {
    // Test database connection
    echo "1. Testing database connection...\n";
    require_once __DIR__ . '/backend/core/db.php';
    echo "✓ Database connection successful\n\n";

    // Check if link_clicks table exists
    echo "2. Checking link_clicks table...\n";
    $stmt = $pdo->query("SHOW TABLES LIKE 'link_clicks'");
    $tableExists = $stmt->fetch();
    
    if ($tableExists) {
        echo "✓ link_clicks table exists\n";
        
        // Show table structure
        echo "\n3. Table structure:\n";
        $stmt = $pdo->query("DESCRIBE link_clicks");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($columns as $column) {
            echo "  - {$column['Field']}: {$column['Type']} {$column['Null']} {$column['Key']}\n";
        }
        
        // Check if there are any existing records
        echo "\n4. Checking existing records...\n";
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM link_clicks");
        $count = $stmt->fetch()['count'];
        echo "  Total records: $count\n";
        
        if ($count > 0) {
            echo "\n5. Sample records:\n";
            $stmt = $pdo->query("SELECT * FROM link_clicks ORDER BY clicked_at DESC LIMIT 5");
            $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($records as $record) {
                echo "  ID: {$record['id']}, Release: {$record['release_id']}, Platform: {$record['platform_name']}, Time: {$record['clicked_at']}, IP: {$record['ip_address']}\n";
            }
        }
        
        // Test insert operation
        echo "\n6. Testing insert operation...\n";
        
        // First, get a valid release_id
        $stmt = $pdo->query("SELECT id FROM releases LIMIT 1");
        $release = $stmt->fetch();
        
        if ($release) {
            $test_release_id = $release['id'];
            $test_platform = 'Test Platform';
            $test_ip = '127.0.0.1';
            
            $stmt = $pdo->prepare("INSERT INTO link_clicks (release_id, platform_name, clicked_at, ip_address) VALUES (?, ?, NOW(), ?)");
            $result = $stmt->execute([$test_release_id, $test_platform, $test_ip]);
            
            if ($result) {
                $insert_id = $pdo->lastInsertId();
                echo "✓ Test insert successful - ID: $insert_id\n";
                
                // Clean up test record
                $stmt = $pdo->prepare("DELETE FROM link_clicks WHERE id = ?");
                $stmt->execute([$insert_id]);
                echo "✓ Test record cleaned up\n";
            } else {
                echo "✗ Test insert failed\n";
                $error_info = $stmt->errorInfo();
                echo "  Error: " . print_r($error_info, true) . "\n";
            }
        } else {
            echo "⚠ No releases found in database - cannot test insert\n";
            echo "  Please create at least one release first\n";
        }
        
    } else {
        echo "✗ link_clicks table does not exist\n";
        echo "\n7. Creating link_clicks table...\n";
        
        $createTableSQL = "
        CREATE TABLE link_clicks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            release_id INT NOT NULL,
            platform_name VARCHAR(255) NOT NULL,
            clicked_at DATETIME NOT NULL,
            ip_address VARCHAR(45) NULL,
            FOREIGN KEY(release_id) REFERENCES releases(id) ON DELETE CASCADE,
            INDEX idx_release_id (release_id),
            INDEX idx_platform_name (platform_name),
            INDEX idx_clicked_at (clicked_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        try {
            $pdo->exec($createTableSQL);
            echo "✓ link_clicks table created successfully\n";
        } catch (PDOException $e) {
            echo "✗ Failed to create table: " . $e->getMessage() . "\n";
        }
    }
    
    // Check releases table
    echo "\n8. Checking releases table...\n";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM releases");
    $releaseCount = $stmt->fetch()['count'];
    echo "  Total releases: $releaseCount\n";
    
    if ($releaseCount > 0) {
        echo "\n9. Sample releases:\n";
        $stmt = $pdo->query("SELECT id, title, artist, shortcode FROM releases LIMIT 5");
        $releases = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($releases as $release) {
            echo "  ID: {$release['id']}, Title: {$release['title']}, Artist: {$release['artist']}, Shortcode: {$release['shortcode']}\n";
        }
    }
    
    // Check links table
    echo "\n10. Checking links table...\n";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM links");
    $linkCount = $stmt->fetch()['count'];
    echo "  Total links: $linkCount\n";
    
    if ($linkCount > 0) {
        echo "\n11. Sample links:\n";
        $stmt = $pdo->query("SELECT id, release_id, platform_name, platform_url FROM links LIMIT 5");
        $links = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($links as $link) {
            echo "  ID: {$link['id']}, Release: {$link['release_id']}, Platform: {$link['platform_name']}\n";
        }
    }
    
    echo "\n=== Verification Complete ===\n";
    echo "Database is properly configured for click tracking!\n";
    
} catch (PDOException $e) {
    echo "✗ Database error: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}