<?php
// config.php - Secure Session Provider & Database Connection Lifecycle
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    ini_set('session.cookie_samesite', 'Strict');
    session_start();
}

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

$host = "localhost";
$db_name = "kairi_seo_db5"; // Updated to point to the new version 6 database
$username = "root";
$password = "";
$conn = null;

try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name . ";charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $exception) {
    echo json_encode([
        "status" => "error",
        "message" => "Database Connection Failure: " . $exception->getMessage()
    ]);
    exit();
}

// Global Helper: Commit an immutable operational activity track record entry
function writeAuditLog($userId, $username, $role, $action, $details) {
    global $conn;
    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
        $stmt = $conn->prepare("INSERT INTO audit_logs (user_id, username, user_role, action_performed, context_details, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $username, $role, $action, $details, $ip]);
    } catch (Exception $e) {
        // Fail silently to safeguard primary user transactions
    }
}
?>