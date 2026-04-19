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
    // Connect directly to the Hostinger database
    $pdo = new PDO($dsn, $user, $pass, $options);

    // Initialize Schema
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

    CREATE TABLE IF NOT EXISTS releases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shortcode VARCHAR(255) UNIQUE,
        title VARCHAR(255) NOT NULL,
        artist VARCHAR(255) NOT NULL,
        cover_image_path VARCHAR(255),
        spotify_embed TEXT
    );

    CREATE TABLE IF NOT EXISTS links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        release_id INT NOT NULL,
        platform_name VARCHAR(255) NOT NULL,
        platform_url VARCHAR(255) NOT NULL,
        logic_order INT DEFAULT 0,
        FOREIGN KEY(release_id) REFERENCES releases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subscribers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        subscribed_at DATETIME NOT NULL,
        ip_address VARCHAR(45) NULL
    );
    ";
    $pdo->exec($schema);

    // Patch for existing databases
    try {
        $pdo->exec("ALTER TABLE admin_users ADD COLUMN session_token VARCHAR(255) NULL");
    } catch (PDOException $e) { /* Ignore */ }

    try {
        $pdo->exec("ALTER TABLE admin_users ADD COLUMN admin_email VARCHAR(255) NULL");
    } catch (PDOException $e) { /* Ignore */ }

    try {
        $pdo->exec("ALTER TABLE admin_users ADD COLUMN otp_code VARCHAR(6) NULL");
    } catch (PDOException $e) { /* Ignore */ }

    try {
        $pdo->exec("ALTER TABLE admin_users ADD COLUMN otp_expires_at DATETIME NULL");
    } catch (PDOException $e) { /* Ignore */ }

    try {
        $pdo->exec("ALTER TABLE releases ADD COLUMN spotify_embed TEXT");
    } catch (PDOException $e) { /* Ignore */ }

    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS subscribers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            subscribed_at DATETIME NOT NULL
        )");
    } catch (PDOException $e) { /* Ignore */ }

    // Add ip_address column for security tracking
    try {
        $pdo->exec("ALTER TABLE subscribers ADD COLUMN ip_address VARCHAR(45) NULL");
    } catch (PDOException $e) { /* Column may already exist */ }

    // Seed default admin user if the table is empty
    $stmt = $pdo->query("SELECT COUNT(*) FROM admin_users");
    if ($stmt->fetchColumn() == 0) {
        $password_hash = password_hash('password', PASSWORD_DEFAULT);
        $stmt_insert = $pdo->prepare("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)");
        $stmt_insert->execute(['admin', $password_hash]);
    }
} catch (PDOException $e) {
    die("MySQL Database Connection failed: " . $e->getMessage() . ". Please ensure your XAMPP MySQL server is running.");
}

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
