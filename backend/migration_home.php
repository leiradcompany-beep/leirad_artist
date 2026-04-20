<?php
require __DIR__ . '/core/db.php';
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS homepage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        artist_name VARCHAR(255) DEFAULT 'Artist Name',
        hero_title VARCHAR(255) DEFAULT 'Official Website',
        hero_subtitle TEXT,
        background_image_path VARCHAR(255) DEFAULT '',
        profile_image_path VARCHAR(255) DEFAULT ''
    )");
    $stmt = $pdo->query("SELECT COUNT(*) FROM homepage");
    if ($stmt->fetchColumn() == 0) {
        $pdo->exec("INSERT INTO homepage (artist_name, hero_title, hero_subtitle) VALUES ('Artist Name', 'Official Website', 'Listen to the latest tracks and releases on all major platforms.')");
    }
    echo "Done";
} catch(Exception $e) {
    echo $e->getMessage();
}
