<?php
// CORS Configuration - Allow specific origins
$allowed_origins = [
    'https://leirad-artist.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
} else {
    // For development, allow all origins (remove in production)
    header("Access-Control-Allow-Origin: *");
}

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Max-Age: 3600");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../core/db.php';

// Log incoming requests for debugging
error_log("Track Click Request - Method: " . $_SERVER['REQUEST_METHOD'] . ", Origin: " . $origin);

$input = json_decode(file_get_contents('php://input'), true);
$release_id = isset($input['release_id']) ? (int)$input['release_id'] : 0;
$platform_name = isset($input['platform_name']) ? trim($input['platform_name']) : '';

error_log("Click Data - Release ID: $release_id, Platform: $platform_name");

if (!$release_id || empty($platform_name)) {
    error_log("Invalid input - Missing release_id or platform_name");
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Missing release_id or platform_name"]);
    exit;
}

try {
    // Verify release exists
    $stmt = $pdo->prepare("SELECT id FROM releases WHERE id = ?");
    $stmt->execute([$release_id]);
    if (!$stmt->fetch()) {
        error_log("Release not found - ID: $release_id");
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Release not found"]);
        exit;
    }

    // Get client IP address
    $ip_address = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
    if ($ip_address && strpos($ip_address, ',') !== false) {
        $ip_address = trim(explode(',', $ip_address)[0]);
    }

    // Sanitize platform name to prevent SQL injection
    $platform_name = htmlspecialchars($platform_name, ENT_QUOTES, 'UTF-8');

    error_log("Attempting to insert click - Release: $release_id, Platform: $platform_name, IP: $ip_address");

    // Insert click tracking data
    $stmt = $pdo->prepare("INSERT INTO link_clicks (release_id, platform_name, clicked_at, ip_address) VALUES (?, ?, NOW(), ?)");
    $result = $stmt->execute([$release_id, $platform_name, $ip_address]);

    if ($result) {
        $insert_id = $pdo->lastInsertId();
        error_log("Click successfully recorded - ID: $insert_id");
        echo json_encode([
            "success" => true, 
            "message" => "Click tracked successfully",
            "click_id" => $insert_id
        ]);
    } else {
        $error_info = $stmt->errorInfo();
        error_log("Failed to track click - SQL Error: " . print_r($error_info, true));
        http_response_code(500);
        echo json_encode([
            "success" => false, 
            "error" => "Failed to track click",
            "details" => "Database insert failed"
        ]);
    }
} catch (PDOException $e) {
    error_log("Click tracking PDO error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "success" => false, 
        "error" => "Database error occurred",
        "details" => $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("Click tracking general error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "success" => false, 
        "error" => "An error occurred",
        "details" => $e->getMessage()
    ]);
}
