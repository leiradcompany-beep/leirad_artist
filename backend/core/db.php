<?php
session_start();

$host = '127.0.0.1';
$db   = 'u130348899_leirad_artist';
$user = 'u130348899_leirad_artist';
$pass = 'D@rielgwapo223';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // =========================
    // FULL SCHEMA (UPDATED)
    // =========================
    $schema = "

    CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        session_token VARCHAR(255) NULL,
        admin_email VARCHAR(255) NULL,
        otp_code VARCHAR(6) NULL,
        otp_expires_at DATETIME NULL
    );

    CREATE TABLE IF NOT EXISTS homepage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        artist_name VARCHAR(255) DEFAULT 'Artist Name',
        hero_title VARCHAR(255) DEFAULT 'Official Website',
        hero_subtitle TEXT,
        background_image_path VARCHAR(255) DEFAULT '',
        profile_image_path VARCHAR(255) DEFAULT '',
        about_me_title VARCHAR(255) DEFAULT 'About Me',
        about_me_content TEXT,
        about_me_image_path VARCHAR(255) DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS releases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shortcode VARCHAR(255) UNIQUE,
        title VARCHAR(255) NOT NULL,
        artist VARCHAR(255) NOT NULL,
        cover_image_path VARCHAR(255),
        spotify_embed TEXT,
        stream_count INT DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        release_id INT NOT NULL,
        platform_name VARCHAR(255) NOT NULL,
        platform_url VARCHAR(255) NOT NULL,
        logic_order INT DEFAULT 0,
        FOREIGN KEY(release_id) REFERENCES releases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS link_clicks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        release_id INT NOT NULL,
        platform_name VARCHAR(255) NOT NULL,
        clicked_at DATETIME NOT NULL,
        ip_address VARCHAR(45) NULL,
        FOREIGN KEY(release_id) REFERENCES releases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subscribers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        subscribed_at DATETIME NOT NULL,
        ip_address VARCHAR(45) NULL
    );

    CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    ";

    $pdo->exec($schema);

    // =========================
    // SAFE PATCHES (for old DB)
    // =========================

    // admin_users updates
    try { $pdo->exec("ALTER TABLE admin_users ADD COLUMN admin_email VARCHAR(255) NULL"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE admin_users ADD COLUMN otp_code VARCHAR(6) NULL"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE admin_users ADD COLUMN otp_expires_at DATETIME NULL"); } catch (PDOException $e) {}

    // releases updates
    try { $pdo->exec("ALTER TABLE releases ADD COLUMN stream_count INT DEFAULT 0"); } catch (PDOException $e) {}

    // homepage updates
    try { $pdo->exec("ALTER TABLE homepage ADD COLUMN about_me_title VARCHAR(255) DEFAULT 'About Me'"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE homepage ADD COLUMN about_me_content TEXT"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE homepage ADD COLUMN about_me_image_path VARCHAR(255) DEFAULT ''"); } catch (PDOException $e) {}

    // link_clicks table
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS link_clicks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            release_id INT NOT NULL,
            platform_name VARCHAR(255) NOT NULL,
            clicked_at DATETIME NOT NULL,
            ip_address VARCHAR(45) NULL
        )");
    } catch (PDOException $e) {}

    // announcements table
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS announcements (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            is_active TINYINT(1) DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )");
    } catch (PDOException $e) {}

    // homepage default row
    $stmt = $pdo->query("SELECT COUNT(*) FROM homepage");
    if ($stmt->fetchColumn() == 0) {
        $pdo->exec("INSERT INTO homepage (artist_name) VALUES ('Leirad G.')");
    }

    // =========================
    // DEFAULT ADMIN
    // =========================
    $stmt = $pdo->query("SELECT COUNT(*) FROM admin_users");
    if ($stmt->fetchColumn() == 0) {
        $password_hash = password_hash('password', PASSWORD_DEFAULT);

        $stmt_insert = $pdo->prepare("
            INSERT INTO admin_users (username, password_hash, admin_email)
            VALUES (?, ?, ?)
        ");
        $stmt_insert->execute(['admin', $password_hash, 'admin@example.com']);
    }

} catch (PDOException $e) {
    die("Database Connection failed: " . $e->getMessage());
}

// =========================
// AUTH HELPERS
// =========================
function isLoggedIn() {
    return isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;
}

function requireLogin() {
    if (!isLoggedIn()) {
        header("Location: ../admin/login.php");
        exit;
    }
}
?>