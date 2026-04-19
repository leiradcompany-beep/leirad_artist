<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once __DIR__ . '/../core/db.php';

$shortcode = isset($_GET['s']) ? trim($_GET['s']) : '';

if (!$shortcode) {
    http_response_code(400);
    echo json_encode(["error" => "No shortcode provided"]);
    exit;
}

$stmt = $pdo->prepare("SELECT * FROM releases WHERE shortcode = ?");
$stmt->execute([$shortcode]);
$release = $stmt->fetch(PDO::FETCH_ASSOC);

if ($release) {
    // Note: Change this to your Hostinger domain in production (e.g., "https://api.yourartist.com/")
    $baseUrl = "https://blandolms.ccsblock2.com/";
    $release['full_cover_url'] = $baseUrl . $release['cover_image_path'];

    $stmt_links = $pdo->prepare("SELECT platform_name, platform_url FROM links WHERE release_id = ? ORDER BY logic_order ASC");
    $stmt_links->execute([$release['id']]);
    $links = $stmt_links->fetchAll(PDO::FETCH_ASSOC);
    
    $release['links'] = $links;
    
    echo json_encode(["success" => true, "data" => $release]);
} else {
    http_response_code(404);
    echo json_encode(["error" => "Release not found"]);
}
