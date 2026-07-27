<?php
// assign_task.php - Standalone Plain-Text Task Processor
require_once 'config.php';

// 1. Read standard Form Data (Bypassing JSON entirely)
$uId = isset($_POST['user_id']) ? (int)$_POST['user_id'] : 0;
$domId = isset($_POST['domain_id']) ? (int)$_POST['domain_id'] : 0;
$bookCategory = isset($_POST['book_category']) ? $_POST['book_category'] : 'green';
$date = isset($_POST['date']) ? $_POST['date'] : date('Y-m-d');

// Grab assigner safely from the active session
$assignerId = $_SESSION['user']['id'] ?? 1; 

// If parameters are missing, output a plain text error and stop
if ($uId === 0 || $domId === 0) {
    die("ERROR: Missing user or domain parameters.");
}

try {
    // 2. Use INSERT IGNORE so if a duplicate happens, it quietly skips instead of crashing
    $stmt = $conn->prepare("INSERT IGNORE INTO daily_duties (user_id, domain_id, book_category, duty_date, assigned_by_user_id) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$uId, $domId, $bookCategory, $date, $assignerId]);

    // 3. Keep the Audit Logs working
    if (function_exists('writeAuditLog') && isset($_SESSION['user'])) {
        writeAuditLog($assignerId, $_SESSION['user']['username'], $_SESSION['user']['role'], 'DUTY_ASSIGNMENT', "Assigned User $uId to Domain $domId via Standalone Processor.");
    }

    // 4. Output the exact word SUCCESS
    echo "SUCCESS";

} catch (PDOException $e) {
    // If the database fails, output a plain text error
    echo "ERROR: " . $e->getMessage();
}
?>