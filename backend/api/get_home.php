<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/../core/db.php';

$stmt = $pdo->query("SELECT * FROM homepage LIMIT 1");
$home = $stmt->fetch(PDO::FETCH_ASSOC);

if ($home) {
    // Note: Change this to Hostinger domain in prod
    $baseUrl = "https://blandolms.ccsblock2.com/";
    $home['full_bg_url'] = $home['background_image_path'] ? $baseUrl . $home['background_image_path'] : '';
    $home['full_profile_url'] = $home['profile_image_path'] ? $baseUrl . $home['profile_image_path'] : '';

    // Fetch releases for the grid
    $stmt_rel = $pdo->query("SELECT id, title, artist, cover_image_path, shortcode FROM releases ORDER BY id DESC");
    $releases = $stmt_rel->fetchAll(PDO::FETCH_ASSOC);
    
    foreach($releases as &$r) {
        if ($r['cover_image_path']) {
            $r['full_cover_url'] = $baseUrl . $r['cover_image_path'];
        }
    }
    
    echo json_encode(["success" => true, "data" => $home, "releases" => $releases]);
} else {
    http_response_code(404);
    echo json_encode(["error" => "No homepage found"]);
}
