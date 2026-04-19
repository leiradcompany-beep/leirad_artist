<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Support both encoded and plain email (for backward compatibility)
    if (isset($input['email_encoded'])) {
        // Decode the base64 encoded email
        $email = urldecode(base64_decode($input['email_encoded']));
    } else {
        $email = $input['email'] ?? '';
    }
    
    $turnstile_token = $input['turnstile_token'] ?? '';
    
    // Security: Log subscription attempt (helps detect abuse)
    $ip_address = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    error_log("[SUBSCRIBE] Email: " . substr($email, 0, 3) . '***@' . (explode('@', $email)[1] ?? '***') . " | IP: " . $ip_address . " | Time: " . date('Y-m-d H:i:s'));
    
    // Security: Rate limiting - check for too many attempts from same IP
    $stmt_rate = $pdo->prepare("SELECT COUNT(*) as attempts FROM subscribers WHERE subscribed_at > DATE_SUB(NOW(), INTERVAL 1 HOUR) AND ip_address = ?");
    $stmt_rate->execute([$ip_address]);
    $attempts = $stmt_rate->fetch(PDO::FETCH_ASSOC)['attempts'] ?? 0;
    
    if ($attempts >= 5) {
        http_response_code(429);
        echo json_encode(["success" => false, "error" => "Too many attempts. Please try again later."]);
        exit;
    }

    // Verify Turnstile token
    if (empty($turnstile_token)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Please complete the security check"]);
        exit;
    }

    // Get Turnstile secret from .env
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

    $turnstile_secret = getEnvVal('TURNSTILE_SECRET_KEY');
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(['secret' => $turnstile_secret, 'response' => $turnstile_token]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    curl_close($ch);
    
    $outcome = json_decode($response);
    if (!$outcome || empty($outcome->success)) {
        http_response_code(403);
        echo json_encode(["success" => false, "error" => "Security verification failed"]);
        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid email address"]);
        exit;
    }

    // Check if email already exists
    $stmt = $pdo->prepare("SELECT id FROM subscribers WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(["success" => false, "error" => "Email already subscribed"]);
        exit;
    }

    // Insert email into database with IP address for security tracking
    $stmt = $pdo->prepare("INSERT INTO subscribers (email, subscribed_at, ip_address) VALUES (?, NOW(), ?)");
    $stmt->execute([$email, $ip_address]);

    // Send welcome email using PHPMailer
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
        $mail->addAddress($email);

        // Content
        $mail->isHTML(true);
        $mail->CharSet  = 'UTF-8';
        $mail->Encoding = 'base64';
        $mail->Subject  = '=?UTF-8?B?' . base64_encode('Welcome to Leirad Artist - Your Subscription is Confirmed') . '?=';
        $mail->Body    = '
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>Welcome to Leirad Artist</title>
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
    Your subscription to Leirad Artist is confirmed. Exclusive music, events, and updates await you.
</div>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#EFEFEC;">
    <tr>
        <td align="center" style="padding:48px 16px;">

            <!-- Outer Card -->
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:4px;overflow:hidden;">

                <!-- ═══════════════════════════════════
                     HEADER BAND
                ════════════════════════════════════ -->
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
                                    <!-- Wordmark -->
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

                <!-- ═══════════════════════════════════
                     GREETING SECTION
                ════════════════════════════════════ -->
                <tr>
                    <td style="padding:52px 52px 0 52px;">
                        <p style="margin:0 0 6px 0;font-family:\'DM Sans\',Arial,sans-serif;font-size:12px;font-weight:600;color:#C9A96E;letter-spacing:3px;text-transform:uppercase;">Subscription Confirmed</p>
                        <h2 style="margin:0 0 24px 0;font-family:\'Playfair Display\',Georgia,serif;font-size:30px;font-weight:600;color:#0F0F0F;line-height:1.25;">You are now part of the inner circle.</h2>
                        <p style="margin:0 0 18px 0;font-family:\'DM Sans\',Arial,sans-serif;font-size:16px;line-height:1.8;color:#4A4A4A;">Dear Music Lover,</p>
                        <p style="margin:0 0 18px 0;font-family:\'DM Sans\',Arial,sans-serif;font-size:16px;line-height:1.8;color:#4A4A4A;">
                            Thank you for subscribing to the <strong style="color:#0F0F0F;font-weight:600;">Leirad Artist</strong> newsletter. Your subscription has been successfully confirmed, and we are genuinely glad to have you with us.
                        </p>
                        <p style="margin:0 0 0 0;font-family:\'DM Sans\',Arial,sans-serif;font-size:16px;line-height:1.8;color:#4A4A4A;">
                            As an official subscriber, you will be among the first to receive:
                        </p>
                    </td>
                </tr>

                <!-- ═══════════════════════════════════
                     BENEFITS — ICON + TEXT ROWS
                ════════════════════════════════════ -->
                <tr>
                    <td style="padding:32px 52px 0 52px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #E8E8E4;border-radius:4px;overflow:hidden;">

                            <!-- Benefit 1 — New Releases -->
                            <tr>
                                <td style="padding:22px 24px;border-bottom:1px solid #F0F0EC;">
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                        <tr>
                                            <!-- Icon cell -->
                                            <td width="48" valign="middle" style="padding-right:20px;">
                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                    <tr>
                                                        <td width="48" height="48" align="center" valign="middle" style="background-color:#0F0F0F;border-radius:4px;width:48px;height:48px;">
                                                            <!-- Music note SVG as inline image workaround via unicode in styled span -->
                                                            <span style="font-size:22px;line-height:48px;display:block;text-align:center;">&#127925;</span>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <!-- Text cell -->
                                            <td valign="middle">
                                                <p style="margin:0 0 3px 0;font-family:\'DM Sans\',Arial,sans-serif;font-size:13px;font-weight:600;color:#C9A96E;letter-spacing:2px;text-transform:uppercase;">New Music Releases</p>
                                                <p style="margin:0;font-family:\'DM Sans\',Arial,sans-serif;font-size:15px;line-height:1.6;color:#4A4A4A;">Be the first to hear new tracks, albums, and exclusive debut previews before the public.</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Benefit 2 — Live Events -->
                            <tr>
                                <td style="padding:22px 24px;border-bottom:1px solid #F0F0EC;">
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                        <tr>
                                            <td width="48" valign="middle" style="padding-right:20px;">
                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                    <tr>
                                                        <td width="48" height="48" align="center" valign="middle" style="background-color:#0F0F0F;border-radius:4px;width:48px;height:48px;">
                                                            <span style="font-size:22px;line-height:48px;display:block;text-align:center;">&#127908;</span>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td valign="middle">
                                                <p style="margin:0 0 3px 0;font-family:\'DM Sans\',Arial,sans-serif;font-size:13px;font-weight:600;color:#C9A96E;letter-spacing:2px;text-transform:uppercase;">Live Events & Performances</p>
                                                <p style="margin:0;font-family:\'DM Sans\',Arial,sans-serif;font-size:15px;line-height:1.6;color:#4A4A4A;">Priority notifications on upcoming shows, concerts, and live performances near you.</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Benefit 3 — Behind the Scenes -->
                            <tr>
                                <td style="padding:22px 24px;border-bottom:1px solid #F0F0EC;">
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                        <tr>
                                            <td width="48" valign="middle" style="padding-right:20px;">
                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                    <tr>
                                                        <td width="48" height="48" align="center" valign="middle" style="background-color:#0F0F0F;border-radius:4px;width:48px;height:48px;">
                                                            <span style="font-size:22px;line-height:48px;display:block;text-align:center;">&#127916;</span>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td valign="middle">
                                                <p style="margin:0 0 3px 0;font-family:\'DM Sans\',Arial,sans-serif;font-size:13px;font-weight:600;color:#C9A96E;letter-spacing:2px;text-transform:uppercase;">Behind-the-Scenes Access</p>
                                                <p style="margin:0;font-family:\'DM Sans\',Arial,sans-serif;font-size:15px;line-height:1.6;color:#4A4A4A;">Exclusive studio updates, artist commentary, and content you will not find anywhere else.</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Benefit 4 — Exclusive Offers -->
                            <tr>
                                <td style="padding:22px 24px;">
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                        <tr>
                                            <td width="48" valign="middle" style="padding-right:20px;">
                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                    <tr>
                                                        <td width="48" height="48" align="center" valign="middle" style="background-color:#0F0F0F;border-radius:4px;width:48px;height:48px;">
                                                            <span style="font-size:22px;line-height:48px;display:block;text-align:center;">&#127873;</span>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td valign="middle">
                                                <p style="margin:0 0 3px 0;font-family:\'DM Sans\',Arial,sans-serif;font-size:13px;font-weight:600;color:#C9A96E;letter-spacing:2px;text-transform:uppercase;">Subscriber-Only Offers</p>
                                                <p style="margin:0;font-family:\'DM Sans\',Arial,sans-serif;font-size:15px;line-height:1.6;color:#4A4A4A;">Special discounts, early access to merchandise, and rewards reserved exclusively for our subscribers.</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>

                <!-- ═══════════════════════════════════
                     CALL TO ACTION
                ════════════════════════════════════ -->
                <tr>
                    <td style="padding:40px 52px 0 52px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0F0F0F;border-radius:4px;">
                            <tr>
                                <td align="center" style="padding:36px 32px;">
                                    <p style="margin:0 0 6px 0;font-family:\'DM Sans\',Arial,sans-serif;font-size:12px;font-weight:600;color:#C9A96E;letter-spacing:3px;text-transform:uppercase;">Stay Connected</p>
                                    <p style="margin:0 0 24px 0;font-family:\'Playfair Display\',Georgia,serif;font-size:20px;color:#FFFFFF;line-height:1.4;">Follow Leirad Artist on Facebook for daily updates</p>
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
                                        <tr>
                                            <td align="center" style="border-radius:3px;background-color:#C9A96E;">
                                                <a href="https://www.facebook.com/LeiradOfficial/" target="_blank"
                                                   style="display:inline-block;padding:14px 36px;font-family:\'DM Sans\',Arial,sans-serif;font-size:13px;font-weight:600;color:#0F0F0F;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">
                                                    Visit Our Page
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- ═══════════════════════════════════
                     SIGNATURE
                ════════════════════════════════════ -->
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

                <!-- ═══════════════════════════════════
                     FOOTER
                ════════════════════════════════════ -->
                <tr>
                    <td style="background-color:#0F0F0F;padding:32px 52px;">
                        <!-- Gold top rule -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td style="height:1px;background-color:#C9A96E;font-size:0;line-height:0;margin-bottom:24px;">&nbsp;</td>
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

        $mail->AltBody = "LEIRAD ARTIST — SUBSCRIPTION CONFIRMED\n\n"
            . "Dear Music Lover,\n\n"
            . "Thank you for subscribing to the Leirad Artist newsletter. Your subscription has been confirmed.\n\n"
            . "As an official subscriber, you will receive:\n\n"
            . "  • New Music Releases — Be the first to hear new tracks and exclusive previews.\n"
            . "  • Live Events & Performances — Priority notifications on upcoming shows.\n"
            . "  • Behind-the-Scenes Access — Exclusive studio updates and artist content.\n"
            . "  • Subscriber-Only Offers — Discounts, merchandise, and early access.\n\n"
            . "Follow us on Facebook: https://www.facebook.com/LeiradOfficial/\n\n"
            . "With appreciation,\n"
            . "Leirad Artist — Official Newsletter Team\n\n"
            . "---\n"
            . "You received this message because you subscribed at leiradcompany@gmail.com\n"
            . "(c) 2026 Leirad Artist. All rights reserved.";

        $mail->send();
        echo json_encode(["success" => true, "message" => "Subscription successful! Welcome email sent."]);
    } catch (Exception $e) {
        error_log("Mail Error: " . $mail->ErrorInfo);
        echo json_encode(["success" => true, "message" => "Subscribed successfully!"]);
    }
    exit;
}

http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);
exit;