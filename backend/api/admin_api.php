<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Auth Header parsing
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (empty($authHeader) && function_exists('getallheaders')) {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
}

$auth = trim(preg_replace('/Bearer\s+/', '', $authHeader));

$stmt = $pdo->query("SELECT * FROM admin_users WHERE username = 'admin'");
$adminUser = $stmt->fetch();

$action = $_GET['action'] ?? '';

// Helper to get Env values securely across environments
function getEnvVal($key) {
    if (file_exists(__DIR__ . '/../.env')) {
        $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            list($name, $value) = explode('=', $line, 2);
            if (trim($name) === $key) return trim($value);
        }
    }
    return $_ENV[$key] ?? $_SERVER[$key] ?? '';
}

// 1. Initial Login: Verify password and generate OTP
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'login') {
    $turnstile_token = $_POST['turnstile_token'] ?? '';
    $secret = getEnvVal('TURNSTILE_SECRET_KEY');
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(['secret' => $secret, 'response' => $turnstile_token]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $curl_err = curl_error($ch);
    curl_close($ch);
    
    $outcome = json_decode($response);
    if (!$outcome || empty($outcome->success)) {
        http_response_code(403);
        $debugInfo = [
            "error" => "Security verification failed",
             "secret_found" => !empty($secret),
             "turnstile_token_found" => !empty($turnstile_token),
             "curl_error" => $curl_err,
             "cloudflare_response" => $outcome
        ];
        echo json_encode($debugInfo);
        exit;
    }

    $password = $_POST['password'] ?? '';
    if ($adminUser && password_verify($password, $adminUser['password_hash'])) {
        // Check if admin email is set
        if (empty($adminUser['admin_email'])) {
            http_response_code(400);
            echo json_encode([
                "success" => false, 
                "error" => "Admin email not configured. Please contact system administrator."
            ]);
            exit;
        }
        
        // Generate 6-digit OTP
        $otp = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
        $expires_at = date('Y-m-d H:i:s', strtotime('+10 minutes'));
        
        // Store OTP in database
        $pdo->prepare("UPDATE admin_users SET otp_code = ?, otp_expires_at = ? WHERE username = 'admin'")
            ->execute([$otp, $expires_at]);
        
        // Send OTP via email
        $mail = new PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com';
            $mail->SMTPAuth   = true;
            $mail->Username   = 'leiradcompany@gmail.com';
            $mail->Password   = 'grxs voke ljmi errv';
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = 587;
            
            $mail->setFrom('leiradcompany@gmail.com', 'Leirad Artist Admin');
            $mail->addAddress($adminUser['admin_email']);
            
            $mail->isHTML(true);
            $mail->Subject = 'Admin Login Verification Code';
            $mail->Body = '
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 28px;">Verification Code</h1>
                    <p style="color: #e6f7f2; margin: 0; font-size: 16px;">Use this code to complete your admin login</p>
                </div>
                
                <div style="background: #ffffff; padding: 40px; border-radius: 12px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">Your verification code is:</p>
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; display: inline-block;">
                            <span style="font-size: 48px; font-weight: bold; color: #10b981; letter-spacing: 8px; font-family: monospace;">' . $otp . '</span>
                        </div>
                    </div>
                    
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <p style="color: #92400e; margin: 0; font-size: 14px;">
                            <strong>⏱️ Valid for 10 minutes</strong><br>
                            This code will expire at ' . date('g:i A', strtotime($expires_at)) . '
                        </p>
                    </div>
                    
                    <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
                        If you did not attempt to login, please ignore this email or contact support immediately.
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
                    <p>&copy; 2025 Leirad Artist. All rights reserved.</p>
                </div>
            </div>
            ';
            
            $mail->AltBody = "Your admin login verification code is: $otp\n\nThis code is valid for 10 minutes.\n\nIf you did not attempt to login, please ignore this email.";
            
            $mail->send();
        } catch (Exception $e) {
            error_log("OTP Email Error: " . $mail->ErrorInfo);
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Failed to send OTP email"]);
            exit;
        }
        
        // Return success with masked email
        $email_parts = explode('@', $adminUser['admin_email']);
        $masked_email = substr($email_parts[0], 0, 2) . '***@' . $email_parts[1];
        
        echo json_encode([
            "success" => true, 
            "message" => "OTP sent to your email",
            "masked_email" => $masked_email,
            "otp_expires_at" => $expires_at
        ]);
    } else {
        http_response_code(401);
        echo json_encode(["error" => "Invalid password"]);
    }
    exit;
}

// 1.5 Verify OTP and complete login
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'verify_otp') {
    $input = json_decode(file_get_contents('php://input'), true);
    $otp_input = $input['otp'] ?? '';
    
    // Get current admin user
    $stmt = $pdo->query("SELECT * FROM admin_users WHERE username = 'admin'");
    $admin = $stmt->fetch();
    
    if (!$admin) {
        http_response_code(401);
        echo json_encode(["error" => "Admin user not found"]);
        exit;
    }
    
    // Check if OTP exists and not expired
    if (empty($admin['otp_code']) || empty($admin['otp_expires_at'])) {
        http_response_code(400);
        echo json_encode(["error" => "No OTP request found. Please login again."]);
        exit;
    }
    
    $expires_at = strtotime($admin['otp_expires_at']);
    $now = time();
    
    if ($now > $expires_at) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "OTP has expired. Please login again.", "expired" => true]);
        exit;
    }
    
    // Verify OTP
    if ($otp_input !== $admin['otp_code']) {
        http_response_code(401);
        echo json_encode(["success" => false, "error" => "Invalid OTP code"]);
        exit;
    }
    
    // OTP verified - generate session token
    $token = bin2hex(random_bytes(32));
    $pdo->prepare("UPDATE admin_users SET session_token = ?, otp_code = NULL, otp_expires_at = NULL WHERE username = 'admin'")
        ->execute([$token]);
    
    echo json_encode(["success" => true, "token" => $token]);
    exit;
}

// 1.6 Resend OTP
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'resend_otp') {
    // Generate new OTP
    $otp = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires_at = date('Y-m-d H:i:s', strtotime('+10 minutes'));
    
    // Update database
    $pdo->prepare("UPDATE admin_users SET otp_code = ?, otp_expires_at = ? WHERE username = 'admin'")
        ->execute([$otp, $expires_at]);
    
    // Get admin email
    $stmt = $pdo->query("SELECT admin_email FROM admin_users WHERE username = 'admin'");
    $admin = $stmt->fetch();
    
    if (empty($admin['admin_email'])) {
        http_response_code(400);
        echo json_encode(["error" => "Admin email not configured"]);
        exit;
    }
    
    // Send new OTP via email
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'leiradcompany@gmail.com';
        $mail->Password   = 'grxs voke ljmi errv';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;
        
        $mail->setFrom('leiradcompany@gmail.com', 'Leirad Artist Admin');
        $mail->addAddress($admin['admin_email']);
        
        $mail->isHTML(true);
        $mail->Subject = 'Admin Login Verification Code (Resent)';
        $mail->Body = '
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 12px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 28px;">New Verification Code</h1>
                <p style="color: #fef3c7; margin: 0; font-size: 16px;">Your previous code has been replaced</p>
            </div>
            
            <div style="background: #ffffff; padding: 40px; border-radius: 12px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">Your new verification code is:</p>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; display: inline-block;">
                        <span style="font-size: 48px; font-weight: bold; color: #f59e0b; letter-spacing: 8px; font-family: monospace;">' . $otp . '</span>
                    </div>
                </div>
                
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="color: #92400e; margin: 0; font-size: 14px;">
                        <strong>⏱️ Valid for 10 minutes</strong><br>
                        This code will expire at ' . date('g:i A', strtotime($expires_at)) . '
                    </p>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
                <p>&copy; 2025 Leirad Artist. All rights reserved.</p>
            </div>
        </div>
        ';
        
        $mail->AltBody = "Your new admin login verification code is: $otp\n\nThis code is valid for 10 minutes.";
        
        $mail->send();
        
        echo json_encode([
            "success" => true, 
            "message" => "New OTP sent",
            "otp_expires_at" => $expires_at
        ]);
    } catch (Exception $e) {
        error_log("Resend OTP Email Error: " . $mail->ErrorInfo);
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Failed to send OTP email"]);
        exit;
    }
    exit;
}

// 2. Strict Session Token Checking explicitly for all other endpoints
if (!$adminUser || empty($auth) || $auth !== $adminUser['session_token']) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

// 3. Logout API - invalidate token securely
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'logout') {
    $pdo->query("UPDATE admin_users SET session_token = NULL WHERE username = 'admin'");
    echo json_encode(["success" => true]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'list') {
    $stmt = $pdo->query("SELECT * FROM releases ORDER BY id DESC");
    $releases = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Add full urls
    $baseUrl = "https://blandolms.ccsblock2.com/";
    foreach($releases as &$r) {
        if ($r['cover_image_path']) {
            $r['full_cover_url'] = $baseUrl . $r['cover_image_path'];
        }
    }
    
    echo json_encode(["success" => true, "data" => $releases]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'get') {
    $id = (int)($_GET['id'] ?? 0);
    $stmt = $pdo->prepare("SELECT * FROM releases WHERE id = ?");
    $stmt->execute([$id]);
    $release = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($release) {
        $baseUrl = "https://blandolms.ccsblock2.com/";
        if ($release['cover_image_path']) {
            $release['full_cover_url'] = $baseUrl . $release['cover_image_path'];
        }

        $stmt_links = $pdo->prepare("SELECT platform_name, platform_url FROM links WHERE release_id = ? ORDER BY logic_order ASC");
        $stmt_links->execute([$id]);
        $release['links'] = $stmt_links->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(["success" => true, "data" => $release]);
    } else {
        http_response_code(404);
        echo json_encode(["error" => "Not found"]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'save') {
    $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
    $title = $_POST['title'] ?? '';
    $artist = $_POST['artist'] ?? '';
    $spotify_embed = $_POST['spotify_embed'] ?? '';
    $isNew = !$id;
    
    // File upload
    $cover_image_path = '';
    if ($id) {
        $st = $pdo->prepare("SELECT cover_image_path FROM releases WHERE id = ?");
        $st->execute([$id]);
        $res = $st->fetch();
        if ($res) $cover_image_path = $res['cover_image_path'];
    }
    
    if (isset($_FILES['cover_image']) && $_FILES['cover_image']['error'] === UPLOAD_ERR_OK) {
        $upload_dir = __DIR__ . '/../public/uploads';
        if (!file_exists($upload_dir)) mkdir($upload_dir, 0777, true);
        $ext = pathinfo($_FILES['cover_image']['name'], PATHINFO_EXTENSION);
        $new_name = uniqid('cover_') . '.' . $ext;
        if (move_uploaded_file($_FILES['cover_image']['tmp_name'], $upload_dir . '/' . $new_name)) {
            $cover_image_path = 'backend/public/uploads/' . $new_name;
        }
    }

    if ($id) {
        $stmt = $pdo->prepare("UPDATE releases SET title = ?, artist = ?, cover_image_path = ?, spotify_embed = ? WHERE id = ?");
        $stmt->execute([$title, $artist, $cover_image_path, $spotify_embed, $id]);
        $release_id = $id;
    } else {
        $shortcode = substr(md5(uniqid(rand(), true)), 0, 8);
        $stmt = $pdo->prepare("INSERT INTO releases (title, artist, cover_image_path, shortcode, spotify_embed) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$title, $artist, $cover_image_path, $shortcode, $spotify_embed]);
        $release_id = $pdo->lastInsertId();
    }

    // Links update
    $pdo->prepare("DELETE FROM links WHERE release_id = ?")->execute([$release_id]);
    $links = isset($_POST['links']) ? json_decode($_POST['links'], true) : [];
    
    if (is_array($links)) {
        $stmt_insert_link = $pdo->prepare("INSERT INTO links (release_id, platform_name, platform_url, logic_order) VALUES (?, ?, ?, ?)");
        foreach ($links as $index => $l) {
            if (!empty($l['platform_name']) && !empty($l['platform_url'])) {
                $stmt_insert_link->execute([$release_id, $l['platform_name'], $l['platform_url'], $index]);
            }
        }
    }

    // If this is a NEW release, send notification emails to all subscribers
    if ($isNew) {
        try {
            // Get the shortcode from the database
            $stmt_code = $pdo->prepare("SELECT shortcode FROM releases WHERE id = ?");
            $stmt_code->execute([$release_id]);
            $release_data = $stmt_code->fetch(PDO::FETCH_ASSOC);
            $shortcode = $release_data['shortcode'] ?? '';
            
            // Get all subscribers
            $stmt_subscribers = $pdo->query("SELECT email FROM subscribers");
            $subscribers = $stmt_subscribers->fetchAll(PDO::FETCH_COLUMN);
            
            if (!empty($subscribers) && $shortcode) {
                // Build the release link
                $release_link = "https://leirad-artist.vercel.app/?s=" . $shortcode;

                // Safe versions for HTML output
                $title_html   = htmlspecialchars($title,        ENT_QUOTES, 'UTF-8');
                $artist_html  = htmlspecialchars($artist,       ENT_QUOTES, 'UTF-8');
                $link_html    = htmlspecialchars($release_link, ENT_QUOTES, 'UTF-8');
                
                foreach ($subscribers as $subscriber_email) {
                    $mail = new PHPMailer(true);
                    
                    try {
                        // Server settings
                        $mail->isSMTP();
                        $mail->Host       = 'smtp.gmail.com';
                        $mail->SMTPAuth   = true;
                        $mail->Username   = 'leiradcompany@gmail.com';
                        $mail->Password   = 'grxs voke ljmi errv';
                        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
                        $mail->Port       = 587;
                        
                        // Recipients
                        $mail->setFrom('leiradcompany@gmail.com', 'Leirad Artist');
                        $mail->addAddress($subscriber_email);
                        
                        // Content
                        $mail->isHTML(true);
                        $mail->CharSet  = 'UTF-8';
                        $mail->Encoding = 'base64';
                        $mail->Subject  = '=?UTF-8?B?' . base64_encode('New Release: ' . $title . ' by ' . $artist) . '?=';

                        $mail->Body = '
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>New Release — Leirad Artist</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        @import url(\'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap\');
    </style>
</head>
<body style="margin:0;padding:0;background-color:#EFEFEC;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;font-family:\'DM Sans\',Arial,sans-serif;">

<!-- Preheader text (hidden) -->
<div style="display:none;font-size:1px;color:#EFEFEC;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    New music from Leirad Artist — ' . $title_html . ' by ' . $artist_html . ' is now available. Listen now.
</div>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#EFEFEC;">
    <tr>
        <td align="center" style="padding:48px 16px;">

            <!-- Outer Card -->
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:4px;overflow:hidden;">

                <!-- HEADER BAND -->
                <tr>
                    <td style="background-color:#0F0F0F;padding:0;">
                        <!-- Top accent stripe -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td style="height:3px;background:linear-gradient(90deg,#C9A96E 0%,#E8D5A3 50%,#C9A96E 100%);font-size:0;line-height:0;">&nbsp;</td>
                            </tr>
                        </table>
                        <!-- Logo area -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td align="center" style="padding:44px 40px 40px 40px;">
                                    <h1 style="margin:0;font-family:\'Playfair Display\',Georgia,serif;font-size:40px;font-weight:700;color:#FFFFFF;letter-spacing:6px;text-transform:uppercase;line-height:1;">LEIRAD</h1>
                                    <!-- Divider line with dot -->
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:14px auto 0 auto;">
                                        <tr>
                                            <td style="width:50px;height:1px;background-color:#C9A96E;font-size:0;line-height:0;"></td>
                                            <td style="width:6px;height:6px;background-color:#C9A96E;border-radius:50%;font-size:0;line-height:0;"></td>
                                            <td style="width:50px;height:1px;background-color:#C9A96E;font-size:0;line-height:0;"></td>
                                        </tr>
                                    </table>
                                    <p style="margin:12px 0 0 0;font-family:\'DM Sans\',Arial,sans-serif;font-size:11px;font-weight:500;color:#C9A96E;letter-spacing:5px;text-transform:uppercase;">OFFICIAL ARTIST NEWSLETTER</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- NEW RELEASE LABEL + HEADLINE -->
                <tr>
                    <td style="padding:52px 52px 0 52px;">
                        <p style="margin:0 0 6px 0;font-family:\'DM Sans\',Arial,sans-serif;font-size:12px;font-weight:600;color:#C9A96E;letter-spacing:3px;text-transform:uppercase;">New Release</p>
                        <h2 style="margin:0 0 24px 0;font-family:\'Playfair Display\',Georgia,serif;font-size:30px;font-weight:600;color:#0F0F0F;line-height:1.25;">Something new just dropped.</h2>
                        <p style="margin:0 0 18px 0;font-family:\'DM Sans\',Arial,sans-serif;font-size:16px;line-height:1.8;color:#4A4A4A;">Dear Music Lover,</p>
                        <p style="margin:0 0 0 0;font-family:\'DM Sans\',Arial,sans-serif;font-size:16px;line-height:1.8;color:#4A4A4A;">
                            We are excited to share that a brand-new track from <strong style="color:#0F0F0F;font-weight:600;">Leirad Artist</strong> is now available across all major streaming platforms. As a valued subscriber, you are among the very first to know.
                        </p>
                    </td>
                </tr>

                <!-- RELEASE CARD -->
                <tr>
                    <td style="padding:32px 52px 0 52px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #E8E8E4;border-radius:4px;overflow:hidden;">
                            <tr>
                                <!-- Left gold accent bar -->
                                <td width="4" style="background:linear-gradient(180deg,#C9A96E 0%,#E8D5A3 50%,#C9A96E 100%);font-size:0;line-height:0;">&nbsp;</td>
                                <td style="padding:28px 28px 28px 24px;">
                                    <p style="margin:0 0 4px 0;font-family:\'DM Sans\',Arial,sans-serif;font-size:12px;font-weight:600;color:#C9A96E;letter-spacing:3px;text-transform:uppercase;">Now Available</p>
                                    <h3 style="margin:0 0 6px 0;font-family:\'Playfair Display\',Georgia,serif;font-size:26px;font-weight:600;color:#0F0F0F;line-height:1.2;">' . $title_html . '</h3>
                                    <p style="margin:0;font-family:\'DM Sans\',Arial,sans-serif;font-size:15px;color:#6B6B6B;">by <strong style="color:#0F0F0F;font-weight:600;">' . $artist_html . '</strong></p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- BODY COPY -->
                <tr>
                    <td style="padding:32px 52px 0 52px;">
                        <p style="margin:0;font-family:\'DM Sans\',Arial,sans-serif;font-size:16px;line-height:1.8;color:#4A4A4A;">
                            Stream it on Spotify, Apple Music, YouTube, and wherever you listen to music. We put everything into this one, and we cannot wait for you to hear it.
                        </p>
                    </td>
                </tr>

                <!-- CALL TO ACTION -->
                <tr>
                    <td style="padding:40px 52px 0 52px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0F0F0F;border-radius:4px;">
                            <tr>
                                <td align="center" style="padding:36px 32px;">
                                    <p style="margin:0 0 6px 0;font-family:\'DM Sans\',Arial,sans-serif;font-size:12px;font-weight:600;color:#C9A96E;letter-spacing:3px;text-transform:uppercase;">Listen Now</p>
                                    <p style="margin:0 0 24px 0;font-family:\'Playfair Display\',Georgia,serif;font-size:20px;color:#FFFFFF;line-height:1.4;">Choose your preferred streaming platform</p>
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
                                        <tr>
                                            <td align="center" style="border-radius:3px;background-color:#C9A96E;">
                                                <a href="' . $link_html . '" target="_blank"
                                                   style="display:inline-block;padding:14px 36px;font-family:\'DM Sans\',Arial,sans-serif;font-size:13px;font-weight:600;color:#0F0F0F;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">
                                                    Stream It Now
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- DIVIDER -->
                <tr>
                    <td style="padding:40px 52px 0 52px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td style="height:1px;background-color:#E8E8E4;font-size:0;line-height:0;">&nbsp;</td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- SOCIAL NUDGE -->
                <tr>
                    <td style="padding:28px 52px 0 52px;">
                        <p style="margin:0;font-family:\'DM Sans\',Arial,sans-serif;font-size:15px;line-height:1.8;color:#4A4A4A;">
                            Loved the track? Share it with your friends and follow us on
                            <a href="https://www.facebook.com/LeiradOfficial/" target="_blank" style="color:#C9A96E;text-decoration:none;font-weight:600;">Facebook</a>
                            for behind-the-scenes content, upcoming events, and more exclusive releases.
                        </p>
                    </td>
                </tr>

                <!-- SIGNATURE -->
                <tr>
                    <td style="padding:40px 52px 48px 52px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td>
                                    <p style="margin:0 0 6px 0;font-family:\'DM Sans\',Arial,sans-serif;font-size:15px;line-height:1.7;color:#6B6B6B;">With appreciation,</p>
                                    <p style="margin:0 0 2px 0;font-family:\'Playfair Display\',Georgia,serif;font-size:20px;font-weight:600;color:#0F0F0F;">Leirad Artist</p>
                                    <p style="margin:0;font-family:\'DM Sans\',Arial,sans-serif;font-size:13px;color:#C9A96E;letter-spacing:2px;text-transform:uppercase;font-weight:500;">Official Newsletter Team</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                    <td style="background-color:#0F0F0F;padding:32px 52px;">
                        <!-- Gold top rule -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td style="height:1px;background-color:#C9A96E;font-size:0;line-height:0;">&nbsp;</td>
                            </tr>
                        </table>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;">
                            <tr>
                                <td align="center">
                                    <p style="margin:0 0 10px 0;font-family:\'DM Sans\',Arial,sans-serif;font-size:13px;line-height:1.7;color:#888888;">
                                        You received this automated message because you subscribed to the Leirad Artist newsletter.
                                    </p>
                                    <p style="margin:0 0 10px 0;font-family:\'DM Sans\',Arial,sans-serif;font-size:13px;line-height:1.7;color:#888888;">
                                        For inquiries, contact us at
                                        <a href="mailto:leiradcompany@gmail.com" style="color:#C9A96E;text-decoration:none;font-weight:500;">leiradcompany@gmail.com</a>
                                    </p>
                                    <p style="margin:24px 0 0 0;font-family:\'DM Sans\',Arial,sans-serif;font-size:12px;color:#555555;letter-spacing:1px;">
                                        &copy; 2025 &nbsp;&mdash;&nbsp; LEIRAD ARTIST &nbsp;&mdash;&nbsp; ALL RIGHTS RESERVED
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Bottom gold stripe -->
                <tr>
                    <td style="height:3px;background:linear-gradient(90deg,#C9A96E 0%,#E8D5A3 50%,#C9A96E 100%);font-size:0;line-height:0;">&nbsp;</td>
                </tr>

            </table>
            <!-- End Outer Card -->

        </td>
    </tr>
</table>

</body>
</html>
';

                        $mail->AltBody = "LEIRAD ARTIST — NEW RELEASE\n\n"
                            . "Dear Music Lover,\n\n"
                            . "A brand-new track from Leirad Artist is now available:\n\n"
                            . "  " . $title . "\n"
                            . "  by " . $artist . "\n\n"
                            . "Stream it now on your favourite platform:\n"
                            . $release_link . "\n\n"
                            . "Loved the track? Follow us on Facebook:\n"
                            . "https://www.facebook.com/LeiradOfficial/\n\n"
                            . "With appreciation,\n"
                            . "Leirad Artist — Official Newsletter Team\n\n"
                            . "---\n"
                            . "You received this message because you subscribed to the Leirad Artist newsletter.\n"
                            . "For inquiries: leiradcompany@gmail.com\n"
                            . "(c) 2025 Leirad Artist. All rights reserved.";
                        
                        $mail->send();
                    } catch (Exception $e) {
                        // Log error but continue with next subscriber
                        error_log("Mail Error to $subscriber_email: " . $mail->ErrorInfo);
                    }
                }
            }
        } catch (Exception $e) {
            error_log("Subscriber notification error: " . $e->getMessage());
        }
    }

    echo json_encode(["success" => true]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'get_home') {
    $stmt = $pdo->query("SELECT * FROM homepage LIMIT 1");
    $home = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($home) {
        $baseUrl = "https://blandolms.ccsblock2.com/";
        $home['full_bg_url'] = $home['background_image_path'] ? $baseUrl . $home['background_image_path'] : '';
        $home['full_profile_url'] = $home['profile_image_path'] ? $baseUrl . $home['profile_image_path'] : '';
        echo json_encode(["success" => true, "data" => $home]);
    } else {
        echo json_encode(["error" => "Not found"]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'save_home') {
    $artist_name = $_POST['artist_name'] ?? '';
    $hero_title = $_POST['hero_title'] ?? '';
    $hero_subtitle = $_POST['hero_subtitle'] ?? '';

    $stmt = $pdo->query("SELECT * FROM homepage LIMIT 1");
    $home = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $bg_path = $home['background_image_path'] ?? '';
    $profile_path = $home['profile_image_path'] ?? '';

    $upload_dir = __DIR__ . '/../public/uploads';
    if (!file_exists($upload_dir)) mkdir($upload_dir, 0777, true);

    if (isset($_FILES['bg_image']) && $_FILES['bg_image']['error'] === UPLOAD_ERR_OK) {
        $ext = pathinfo($_FILES['bg_image']['name'], PATHINFO_EXTENSION);
        $new_name = uniqid('homebg_') . '.' . $ext;
        if (move_uploaded_file($_FILES['bg_image']['tmp_name'], $upload_dir . '/' . $new_name)) {
            $bg_path = 'backend/public/uploads/' . $new_name;
        }
    }

    if (isset($_FILES['profile_image']) && $_FILES['profile_image']['error'] === UPLOAD_ERR_OK) {
        $ext = pathinfo($_FILES['profile_image']['name'], PATHINFO_EXTENSION);
        $new_name = uniqid('homeprof_') . '.' . $ext;
        if (move_uploaded_file($_FILES['profile_image']['tmp_name'], $upload_dir . '/' . $new_name)) {
            $profile_path = 'backend/public/uploads/' . $new_name;
        }
    }

    if ($home) {
        $stmt = $pdo->prepare("UPDATE homepage SET artist_name = ?, hero_title = ?, hero_subtitle = ?, background_image_path = ?, profile_image_path = ? WHERE id = ?");
        $stmt->execute([$artist_name, $hero_title, $hero_subtitle, $bg_path, $profile_path, $home['id']]);
    } else {
        $stmt = $pdo->prepare("INSERT INTO homepage (artist_name, hero_title, hero_subtitle, background_image_path, profile_image_path) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$artist_name, $hero_title, $hero_subtitle, $bg_path, $profile_path]);
    }

    echo json_encode(["success" => true]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action === 'delete') {
    $id = (int)($_GET['id'] ?? 0);
    $pdo->prepare("DELETE FROM releases WHERE id = ?")->execute([$id]);
    echo json_encode(["success" => true]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'list_subscribers') {
    // Implement server-side pagination for security
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $perPage = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 10;
    $search = $_GET['search'] ?? '';
    
    // Validate pagination
    $page = max(1, $page);
    $perPage = max(1, min(100, $perPage)); // Limit to 100 max
    
    // Get total count
    if (!empty($search)) {
        $stmt_count = $pdo->prepare("SELECT COUNT(*) as total FROM subscribers WHERE email LIKE ?");
        $stmt_count->execute(['%' . $search . '%']);
    } else {
        $stmt_count = $pdo->query("SELECT COUNT(*) as total FROM subscribers");
    }
    $totalResult = $stmt_count->fetch(PDO::FETCH_ASSOC);
    $total = (int)$totalResult['total'];
    
    // Calculate offset
    $offset = ($page - 1) * $perPage;
    
    // Fetch paginated results
    if (!empty($search)) {
        $stmt = $pdo->prepare("SELECT id, email, subscribed_at FROM subscribers WHERE email LIKE ? ORDER BY subscribed_at DESC LIMIT ? OFFSET ?");
        $stmt->execute(['%' . $search . '%', $perPage, $offset]);
    } else {
        $stmt = $pdo->prepare("SELECT id, email, subscribed_at FROM subscribers ORDER BY subscribed_at DESC LIMIT ? OFFSET ?");
        $stmt->execute([$perPage, $offset]);
    }
    $subscribers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Mask emails for security - show only partial email
    foreach ($subscribers as &$subscriber) {
        $email = $subscriber['email'];
        $parts = explode('@', $email);
        if (count($parts) === 2) {
            $localPart = $parts[0];
            $domainPart = $parts[1];
            
            // Mask the local part: show first char + *** + last char (if long enough)
            if (strlen($localPart) > 2) {
                $maskedLocal = substr($localPart, 0, 1) . '***' . substr($localPart, -1);
            } elseif (strlen($localPart) > 1) {
                $maskedLocal = substr($localPart, 0, 1) . '***';
            } else {
                $maskedLocal = '***';
            }
            
            // Mask domain: show first part + *** + TLD
            $domainParts = explode('.', $domainPart);
            if (count($domainParts) >= 2) {
                $domainName = $domainParts[0];
                $tld = end($domainParts);
                $maskedDomain = substr($domainName, 0, 1) . '***.' . $tld;
            } else {
                $maskedDomain = '***';
            }
            
            $subscriber['email'] = $maskedLocal . '@' . $maskedDomain;
            $subscriber['email_masked'] = true;
        }
    }
    
    $totalPages = ceil($total / $perPage);
    
    echo json_encode([
        "success" => true, 
        "data" => $subscribers,
        "pagination" => [
            "current_page" => $page,
            "per_page" => $perPage,
            "total" => $total,
            "total_pages" => $totalPages
        ]
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action === 'delete_subscriber') {
    $id = (int)($_GET['id'] ?? 0);
    $pdo->prepare("DELETE FROM subscribers WHERE id = ?")->execute([$id]);
    echo json_encode(["success" => true]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action === 'delete_all_subscribers') {
    $pdo->exec("DELETE FROM subscribers");
    echo json_encode(["success" => true]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'change_password') {
    $new_password = $_POST['new_password'] ?? '';
    if (strlen($new_password) < 4) {
        http_response_code(400);
        echo json_encode(["error" => "Password too short"]);
        exit;
    }
    $hash = password_hash($new_password, PASSWORD_DEFAULT);
    $pdo->prepare("UPDATE admin_users SET password_hash = ? WHERE username = 'admin'")->execute([$hash]);
    echo json_encode(["success" => true]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update_admin_email') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid email address"]);
        exit;
    }
    
    $pdo->prepare("UPDATE admin_users SET admin_email = ? WHERE username = 'admin'")->execute([$email]);
    echo json_encode(["success" => true, "message" => "Admin email updated successfully"]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'get_admin_email') {
    $stmt = $pdo->query("SELECT admin_email FROM admin_users WHERE username = 'admin'");
    $admin = $stmt->fetch();
    
    if ($admin && !empty($admin['admin_email'])) {
        // Return masked email
        $email_parts = explode('@', $admin['admin_email']);
        $masked_email = substr($email_parts[0], 0, 2) . '***@' . $email_parts[1];
        echo json_encode(["success" => true, "email" => $admin['admin_email'], "masked_email" => $masked_email]);
    } else {
        echo json_encode(["success" => false, "email" => null]);
    }
    exit;
}