<?php
// api.php - Secured Multi-Role Rest API Endpoint Ingestion Controller
require_once 'config.php';

header('Content-Type: application/json');

register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (ob_get_length()) ob_clean();
        echo json_encode(["status" => "error", "message" => "Fatal PHP Error: " . $error['message'] . " in " . $error['file'] . " on line " . $error['line']]);
        exit();
    }
});

set_exception_handler(function($e) {
    if (ob_get_length()) ob_clean();
    echo json_encode(["status" => "error", "message" => "Uncaught Exception: " . $e->getMessage()]);
    exit();
});

set_error_handler(function($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) return;
    if (ob_get_length()) ob_clean();
    echo json_encode(["status" => "error", "message" => "PHP Error: $message in $file on line $line"]);
    exit();
});

if (!function_exists('writeAuditLog')) {
    function writeAuditLog($user_id, $username, $role, $action, $details) {
        global $conn;
        try {
            if (!$conn) return;
            $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
            $stmt = $conn->prepare("INSERT INTO audit_logs (user_id, username, user_role, action_performed, context_details, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$user_id, $username, $role, $action, $details, $ip]);
        } catch (PDOException $e) {}
    }
}

$action = $_GET['action'] ?? '';
$currentUser = $_SESSION['user'] ?? null;

function requireAuth() {
    global $currentUser;
    if (!$currentUser) {
        echo json_encode(["status" => "auth_error", "message" => "Session missing or expired. Access denied."]);
        exit();
    }
}

function requireRoles($allowedRoles) {
    global $currentUser;
    requireAuth();
    if (!in_array($currentUser['role'], $allowedRoles)) {
        echo json_encode(["status" => "error", "message" => "Unauthorized access scope profile level violations."]);
        exit();
    }
}

// =========================================================================
// PUBLIC ACTIONS: AUTHENTICATION ROUTING GATEWAYS
// =========================================================================

if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $user = $data['username'] ?? '';
    $pass = $data['password'] ?? '';
    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

    // 1. Clean up old failed attempts (> 15 mins old)
    $conn->query("DELETE FROM login_attempts WHERE attempt_time < (NOW() - INTERVAL 15 MINUTE)");

    // 2. Check for brute force lockouts
    $lockCheck = $conn->prepare("SELECT COUNT(*) FROM login_attempts WHERE ip_address = ?");
    $lockCheck->execute([$ip]);
    if ($lockCheck->fetchColumn() >= 5) {
        writeAuditLog(null, $user, 'UNKNOWN', 'LOGIN_LOCKED', "IP $ip temporarily locked out due to brute force security triggers.");
        echo json_encode(["status" => "error", "message" => "Security Lockout: Too many failed attempts. Please try again in 15 minutes."]);
        exit();
    }
    
    // 3. Verify user (Ensure they are not soft-deleted)
    $stmt = $conn->prepare("SELECT * FROM users WHERE username = ? AND is_active = 1 AND is_deleted = 0");
    $stmt->execute([$user]);
    $dbUser = $stmt->fetch();
    
    if ($dbUser && password_verify($pass, $dbUser['password_hash'])) {
        // Clear IP strikes on successful login
        $clearAttempts = $conn->prepare("DELETE FROM login_attempts WHERE ip_address = ?");
        $clearAttempts->execute([$ip]);

        $_SESSION['user'] = [
            "id" => (int)$dbUser['id'],
            "username" => $dbUser['username'],
            "full_name" => $dbUser['full_name'],
            "role" => $dbUser['user_role']
        ];
        writeAuditLog($dbUser['id'], $dbUser['username'], $dbUser['user_role'], 'USER_LOGIN', 'User successfully authenticated session console.');
        echo json_encode(["status" => "success", "user" => $_SESSION['user']]);
    } else {
        // Record failed attempt strike
        $failStmt = $conn->prepare("INSERT INTO login_attempts (ip_address) VALUES (?)");
        $failStmt->execute([$ip]);
        
        writeAuditLog(null, $user, 'UNKNOWN', 'LOGIN_FAILED', 'Invalid authentication credentials attempt block.');
        echo json_encode(["status" => "error", "message" => "Invalid corporate credentials profile match."]);
    }
    exit();
}

if ($action === 'logout') {
    if ($currentUser) {
        writeAuditLog($currentUser['id'], $currentUser['username'], $currentUser['role'], 'USER_LOGOUT', 'User closed active dashboard platform session.');
    }
    session_destroy();
    echo json_encode(["status" => "success"]);
    exit();
}

if ($action === 'check_session') {
    echo json_encode(["status" => "success", "user" => $currentUser]);
    exit();
}

if ($action === 'fetch_audit_logs') {
    requireRoles(['admin', 'it_staff']);
    try {
        $stmt = $conn->query("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 250");
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

if ($action === 'fetch_users') {
    requireAuth();
    if ($currentUser['role'] === 'manager') {
        $stmt = $conn->prepare("SELECT id, username, full_name, user_role, is_active FROM users WHERE user_role = 'user' AND is_deleted = 0 ORDER BY id DESC");
        $stmt->execute();
    } else {
        $stmt = $conn->query("SELECT id, username, full_name, user_role, is_active FROM users WHERE is_deleted = 0 ORDER BY id DESC");
    }
    echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
    exit();
}

if ($action === 'save_user' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireAuth();
    $data = json_decode(file_get_contents("php://input"), true);
    
    $username = trim($data['username'] ?? '');
    $fullName = trim($data['full_name'] ?? '');
    $role = $data['role'] ?? 'user';
    $pwd = $data['password'] ?? '';
    $userId = (int)($data['id'] ?? 0);
    
    if ($currentUser['role'] === 'manager') {
        if ($role !== 'user' || $userId !== 0) {
            echo json_encode(["status" => "error", "message" => "Managers can only register new normal operators."]);
            exit();
        }
    }
    
    if ($currentUser['role'] === 'it_staff') {
        if ($role === 'admin' || $role === 'it_staff') {
            echo json_encode(["status" => "error", "message" => "IT Staff cannot provision administrator or IT roles."]);
            exit();
        }
        if ($userId === 0) {
            echo json_encode(["status" => "error", "message" => "IT Staff cannot register new user accounts; updates only."]);
            exit();
        }
        $checkAdmin = $conn->prepare("SELECT user_role FROM users WHERE id = ?");
        $checkAdmin->execute([$userId]);
        $targetUser = $checkAdmin->fetch();
        if ($targetUser && $targetUser['user_role'] === 'admin') {
            echo json_encode(["status" => "error", "message" => "IT Staff cannot modify master administrator profiles."]);
            exit();
        }
    }
    
    if (empty($username) || empty($fullName)) {
        echo json_encode(["status" => "error", "message" => "Required context parameter keys missing."]);
        exit();
    }
    
    try {
        $hash = password_hash($pwd, PASSWORD_BCRYPT);
        if ($userId > 0) {
            $stmt = $conn->prepare("UPDATE users SET full_name = ?, user_role = ?, password_hash = IF(? != '', ?, password_hash) WHERE id = ?");
            $stmt->execute([$fullName, $role, $pwd, $hash, $userId]);
        } else {
            $stmt = $conn->prepare("INSERT INTO users (username, password_hash, full_name, user_role) VALUES (?, ?, ?, ?)");
            $stmt->execute([$username, $hash, $fullName, $role]);
        }
        
        writeAuditLog($currentUser['id'], $currentUser['username'], $currentUser['role'], 'USER_MANAGEMENT_SAVE', "Created/Modified target username record tracking token: $username");
        echo json_encode(["status" => "success"]);
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => "Username profile token collision error: " . $e->getMessage()]);
    }
    exit();
}

if ($action === 'delete_user' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireRoles(['admin']);
    $data = json_decode(file_get_contents("php://input"), true);
    $targetId = (int)($data['id'] ?? 0);
    
    if ($targetId === $currentUser['id']) {
        echo json_encode(["status" => "error", "message" => "Cannot eliminate active identity lock context from runtime engine."]);
        exit();
    }
    
    // SOFT DELETE
    $stmt = $conn->prepare("UPDATE users SET is_deleted = 1, is_active = 0 WHERE id = ?");
    $stmt->execute([$targetId]);
    writeAuditLog($currentUser['id'], $currentUser['username'], $currentUser['role'], 'USER_MANAGEMENT_DELETE', "Soft-dropped user index allocation token ID: $targetId");
    echo json_encode(["status" => "success"]);
    exit();
}

if ($action === 'save_domain' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireRoles(['admin']);
    $data = json_decode(file_get_contents("php://input"), true);
    
    $siteName = trim($data['site_name'] ?? '');
    $siteUrl = trim($data['site_url'] ?? '');
    $domainId = (int)($data['id'] ?? 0);
    
    if (empty($siteName) || empty($siteUrl)) {
        echo json_encode(["status" => "error", "message" => "Required property parameters missing."]);
        exit();
    }
    
    try {
        if ($domainId > 0) {
            $stmt = $conn->prepare("UPDATE domains SET site_name = ?, site_url = ? WHERE id = ?");
            $stmt->execute([$siteName, $siteUrl, $domainId]);
            writeAuditLog($currentUser['id'], $currentUser['username'], $currentUser['role'], 'DOMAIN_UPDATE', "Updated domain ID $domainId: $siteUrl");
        } else {
            $stmt = $conn->prepare("INSERT INTO domains (site_name, site_url) VALUES (?, ?)");
            $stmt->execute([$siteName, $siteUrl]);
            writeAuditLog($currentUser['id'], $currentUser['username'], $currentUser['role'], 'DOMAIN_CREATE', "Created new domain: $siteUrl");
        }
        echo json_encode(["status" => "success"]);
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => "Database error. URL might already exist. " . $e->getMessage()]);
    }
    exit();
}

if ($action === 'delete_domain' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireRoles(['admin']);
    $data = json_decode(file_get_contents("php://input"), true);
    $targetId = (int)($data['id'] ?? 0);
    
    try {
        // SOFT DELETE
        $stmt = $conn->prepare("UPDATE domains SET is_deleted = 1 WHERE id = ?");
        $stmt->execute([$targetId]);
        writeAuditLog($currentUser['id'], $currentUser['username'], $currentUser['role'], 'DOMAIN_DELETE', "Soft-dropped domain ID: $targetId");
        echo json_encode(["status" => "success"]);
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

if ($action === 'fetch_duties_registry') {
    requireAuth();
    $date = $_GET['date'] ?? date('Y-m-d');
    
    if (in_array($currentUser['role'], ['admin', 'manager', 'it_staff'])) {
        $stmt = $conn->prepare("SELECT d.id as duty_id, u.id as user_id, u.full_name, u.username, dom.id as domain_id, dom.site_name, d.duty_date, d.status, d.book_category, d.completed_at 
                                FROM users u 
                                LEFT JOIN daily_duties d ON u.id = d.user_id AND d.duty_date = ?
                                LEFT JOIN domains dom ON d.domain_id = dom.id AND dom.is_deleted = 0
                                WHERE u.user_role = 'user' AND u.is_deleted = 0 ORDER BY u.id ASC");
        $stmt->execute([$date]);
    } else {
        $stmt = $conn->prepare("SELECT d.id as duty_id, u.id as user_id, u.full_name, dom.id as domain_id, dom.site_name, d.duty_date, d.status, d.book_category, d.completed_at 
                                FROM users u
                                INNER JOIN daily_duties d ON u.id = d.user_id 
                                INNER JOIN domains dom ON d.domain_id = dom.id AND dom.is_deleted = 0
                                WHERE u.id = ? AND d.duty_date = ? AND u.is_deleted = 0");
        $stmt->execute([$currentUser['id'], $date]);
    }
    echo json_encode(["status" => "success", "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit();
}

if ($action === 'fetch_domains') {
    requireAuth();
    if ($currentUser['role'] === 'user') {
        $stmt = $conn->prepare("SELECT DISTINCT d.id, d.site_name, d.site_url FROM domains d INNER JOIN daily_duties dd ON d.id = dd.domain_id WHERE dd.user_id = ? AND dd.duty_date = ? AND d.is_deleted = 0");
        $stmt->execute([$currentUser['id'], date('Y-m-d')]);
    } else {
        $stmt = $conn->prepare("SELECT id, site_name, site_url FROM domains WHERE is_deleted = 0 ORDER BY id ASC");
        $stmt->execute();
    }
    echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
    exit();
}

if ($action === 'fetch_tenant_keywords_metadata') {
    requireAuth();
    $domain_id = isset($_GET['domain_id']) ? (int)$_GET['domain_id'] : 1;
    
    if ($currentUser['role'] === 'user') {
        $verify = $conn->prepare("SELECT id FROM daily_duties WHERE user_id = ? AND domain_id = ? AND duty_date = ?");
        $verify->execute([$currentUser['id'], $domain_id, date('Y-m-d')]);
        if (!$verify->fetch()) {
            echo json_encode(["status" => "error", "message" => "Access denied. Property not scheduled on daily duty configuration profile."]);
            exit();
        }
    }

    try {
        $stmt = $conn->prepare("SELECT book_category, keyword_phrase FROM tenant_keywords WHERE domain_id = ? ORDER BY id ASC");
        $stmt->execute([$domain_id]);
        $rows = $stmt->fetchAll();
        
        $keywordsData = ["section1" => [], "section2" => []];
        foreach ($rows as $row) {
            if ($row['book_category'] === 'green') {
                $keywordsData['section1'][] = $row['keyword_phrase'];
            } elseif ($row['book_category'] === 'black') {
                $keywordsData['section2'][] = $row['keyword_phrase'];
            }
        }
        echo json_encode(["status" => "success", "data" => $keywordsData]);
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

if ($action === 'fetch_records') {
    requireAuth();
    $domain_id = isset($_GET['domain_id']) ? (int)$_GET['domain_id'] : 1;
    
    if ($currentUser['role'] === 'user') {
        $verify = $conn->prepare("SELECT id FROM daily_duties WHERE user_id = ? AND domain_id = ? AND duty_date = ?");
        $verify->execute([$currentUser['id'], $domain_id, date('Y-m-d')]);
        if (!$verify->fetch()) {
            echo json_encode(["status" => "error", "message" => "Access denied."]);
            exit();
        }
    }
    
    try {
        $query = "SELECT k.id, k.book_category, l.evaluation_date, COALESCE(l.page_rank, 0) as page_rank 
                  FROM tenant_keywords k
                  INNER JOIN rank_logs l ON k.id = l.keyword_id AND k.domain_id = l.domain_id
                  WHERE l.domain_id = ? ORDER BY l.evaluation_date ASC, k.id ASC";
        $stmt = $conn->prepare($query);
        $stmt->execute([$domain_id]);
        $rows = $stmt->fetchAll();
        
        $structuredState = ["section1" => [], "section2" => []];
        $indexMap = ["section1" => [], "section2" => []];
        $categoryMap = ["section1" => "green", "section2" => "black"];
        
        foreach ($categoryMap as $sectionKey => $dbEnumVal) {
            $idxStmt = $conn->prepare("SELECT id FROM tenant_keywords WHERE domain_id = ? AND book_category = ? ORDER BY id ASC");
            $idxStmt->execute([$domain_id, $dbEnumVal]);
            $indexMap[$sectionKey] = $idxStmt->fetchAll(PDO::FETCH_COLUMN);
        }
        foreach ($rows as $row) {
            $set = ($row['book_category'] === 'green') ? 'section1' : 'section2';
            $date = $row['evaluation_date'];
            $totalKeywordsInSet = count($indexMap[$set]);
            if ($totalKeywordsInSet === 0) continue;
            if (!isset($structuredState[$set][$date])) {
                $structuredState[$set][$date] = array_fill(0, $totalKeywordsInSet, 0);
            }
            $computedIndex = array_search($row['id'], $indexMap[$set]);
            if ($computedIndex !== false) {
                $structuredState[$set][$date][$computedIndex] = (int)$row['page_rank'];
            }
        }
        echo json_encode(["status" => "success", "data" => $structuredState]);
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

if ($action === 'save_matrix' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireAuth(); 
    if ($currentUser['role'] === 'it_staff') {
        echo json_encode(["status" => "error", "message" => "IT Staff role has read-only database matrix privileges."]);
        exit();
    }

    $data = json_decode(file_get_contents("php://input"), true);
    $domId = (int)($data['domain_id'] ?? 0);
    $dbEnumVal = ($data['cluster_set'] === 'section1') ? 'green' : 'black';
    $targetDate = $data['date'] ?? date('Y-m-d');
    
    if ($currentUser['role'] === 'user') {
        $verify = $conn->prepare("SELECT id FROM daily_duties WHERE user_id = ? AND domain_id = ? AND book_category = ? AND duty_date = ?");
        $verify->execute([$currentUser['id'], $domId, $dbEnumVal, $targetDate]);
        if (!$verify->fetch()) {
            echo json_encode(["status" => "error", "message" => "Access Denied: You are not assigned to commit records for this specific property and book category today."]);
            exit();
        }
    }
    
    try {
        $conn->beginTransaction();
        
        $lStmt = $conn->prepare("SELECT id FROM tenant_keywords WHERE domain_id = ? AND book_category = ? ORDER BY id ASC");
        $lStmt->execute([$domId, $dbEnumVal]);
        $keywordIds = $lStmt->fetchAll(PDO::FETCH_COLUMN);
        
        $uStmt = $conn->prepare("INSERT INTO rank_logs (domain_id, keyword_id, evaluation_date, page_rank) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE page_rank = VALUES(page_rank)");
        foreach ($data['rankings'] as $index => $rankValue) {
            if (isset($keywordIds[$index])) {
                $uStmt->execute([$domId, $keywordIds[$index], $targetDate, $rankValue]);
            }
        }
        
        if ($currentUser['role'] === 'user') {
            $completeStmt = $conn->prepare("UPDATE daily_duties SET status = 'Complete', completed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND domain_id = ? AND book_category = ? AND duty_date = ?");
            $completeStmt->execute([$currentUser['id'], $domId, $dbEnumVal, $targetDate]);
        } else {
            $checkStmt = $conn->prepare("SELECT id FROM daily_duties WHERE domain_id = ? AND book_category = ? AND duty_date = ?");
            $checkStmt->execute([$domId, $dbEnumVal, $targetDate]);
            $existingDuty = $checkStmt->fetch();

            if ($existingDuty) {
                $completeStmt = $conn->prepare("UPDATE daily_duties SET status = 'Complete', completed_at = CURRENT_TIMESTAMP, user_id = ? WHERE id = ?");
                $completeStmt->execute([$currentUser['id'], $existingDuty['id']]);
            } else {
                $insertStmt = $conn->prepare("INSERT INTO daily_duties (user_id, domain_id, book_category, duty_date, status, assigned_by_user_id, completed_at) VALUES (?, ?, ?, ?, 'Complete', ?, CURRENT_TIMESTAMP)");
                $insertStmt->execute([$currentUser['id'], $domId, $dbEnumVal, $targetDate, $currentUser['id']]);
            }
        }
        
        $conn->commit();
        writeAuditLog($currentUser['id'], $currentUser['username'], $currentUser['role'], 'SAVE_RANK_MATRIX', "Committed ranking matrix for Domain ID: $domId ($dbEnumVal)");
        echo json_encode(["status" => "success", "message" => "Database matrix entry logged successfully."]);
    } catch (PDOException $e) {
        $conn->rollBack();
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

if ($action === 'clear_daily_duties' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireRoles(['admin', 'manager']);
    $data = json_decode(file_get_contents("php://input"), true);
    $date = $data['date'] ?? date('Y-m-d');
    
    try {
        $stmt = $conn->prepare("DELETE FROM daily_duties WHERE duty_date = ? AND status = 'Pending'");
        $stmt->execute([$date]);
        
        writeAuditLog($currentUser['id'], $currentUser['username'], $currentUser['role'], 'DUTY_RESET', "Cleared pending assignments for date: $date (completed preserved)");
        echo json_encode(["status" => "success"]);
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

if ($action === 'save_tenant_keywords_config' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireRoles(['admin']);
    $data = json_decode(file_get_contents("php://input"), true);
    
    try {
        $conn->beginTransaction();
        foreach ($data['domain_ids'] as $dId) {
            $conn->prepare("DELETE FROM tenant_keywords WHERE domain_id = ? AND book_category = ?")->execute([(int)$dId, $data['category_book']]);
            
            $iStmt = $conn->prepare("INSERT INTO tenant_keywords (domain_id, book_category, keyword_phrase) VALUES (?, ?, ?)");
            foreach ($data['phrases'] as $phraseString) {
                if (trim($phraseString) !== "") {
                    $iStmt->execute([(int)$dId, $data['category_book'], trim($phraseString)]);
                }
            }
        }
        $conn->commit();
        writeAuditLog($currentUser['id'], $currentUser['username'], $currentUser['role'], 'STRATEGY_OVERRIDE_BROADCAST', "Broadcast core structural phrase configurations updating matching tracking indexes: " . implode(', ', $data['domain_ids']));
        echo json_encode(["status" => "success"]);
    } catch (PDOException $e) {
        $conn->rollBack();
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

if ($action === 'fetch_notifications') {
    requireAuth();
    try {
        if ($currentUser['role'] === 'user') {
            $stmt = $conn->prepare("SELECT dom.site_name, d.book_category, d.status, d.duty_date 
                                    FROM daily_duties d 
                                    INNER JOIN domains dom ON d.domain_id = dom.id AND dom.is_deleted = 0
                                    WHERE d.user_id = ? AND d.duty_date = ?");
            $stmt->execute([$currentUser['id'], date('Y-m-d')]);
            $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(["status" => "success", "type" => "user_tasks", "data" => $tasks]);
        } 
        else if (in_array($currentUser['role'], ['admin', 'it_staff'])) {
            $stmt = $conn->prepare("SELECT * FROM audit_logs WHERE action_performed = 'FORGOT_PASSWORD_REQUEST' ORDER BY id DESC LIMIT 15");
            $stmt->execute();
            echo json_encode(["status" => "success", "type" => "admin_password_alerts", "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } 
        else if ($currentUser['role'] === 'manager') {
            $stmt = $conn->prepare("SELECT * FROM audit_logs WHERE action_performed = 'SAVE_RANK_MATRIX' ORDER BY id DESC LIMIT 15");
            $stmt->execute();
            echo json_encode(["status" => "success", "type" => "manager_task_alerts", "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        }
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

if ($action === 'mark_notification_read' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireAuth();
    $data = json_decode(file_get_contents("php://input"), true);
    $logId = (int)($data['id'] ?? 0);
    
    try {
        if ($logId > 0) {
            $stmt = $conn->prepare("UPDATE audit_logs SET is_read = 1 WHERE id = ?");
            $stmt->execute([$logId]);
        } else {
            $stmt = $conn->prepare("UPDATE audit_logs SET is_read = 1 WHERE action_performed IN ('USER_LOGIN', 'SAVE_RANK_MATRIX', 'FORGOT_PASSWORD_REQUEST', 'DUTY_ASSIGNMENT')");
            $stmt->execute();
        }
        echo json_encode(["status" => "success"]);
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

if ($action === 'trigger_forgot_password' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $username = trim($data['username'] ?? 'Unknown User');
    
    try {
        writeAuditLog(null, $username, 'USER', 'FORGOT_PASSWORD_REQUEST', "User '$username' requested password assistance from the login portal.");
        echo json_encode(["status" => "success"]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

// =========================================================================
// INQUIRIES DESK & PERFORMANCE MODULE ENDPOINTS
// =========================================================================

// Fetch domains assigned to the current user (Admins AND Managers get all)
if ($action === 'fetch_assigned_inquiry_domains') {
    requireAuth();
    try {
        if ($currentUser['role'] === 'admin' || $currentUser['role'] === 'manager') {
            $stmt = $conn->query("SELECT id, site_name, site_url FROM domains WHERE is_deleted = 0 ORDER BY site_name ASC");
        } else {
            // IT Staff only see their assigned domains
            $stmt = $conn->prepare("
                SELECT d.id, d.site_name, d.site_url 
                FROM domains d 
                INNER JOIN inquiry_assignments ia ON d.id = ia.domain_id 
                WHERE ia.user_id = ? AND d.is_deleted = 0 ORDER BY d.site_name ASC
            ");
            $stmt->execute([$currentUser['id']]);
        }
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

// Fetch Inquiry Records
if ($action === 'fetch_inquiries') {
    requireAuth();
    try {
        if ($currentUser['role'] === 'admin' || $currentUser['role'] === 'manager') {
            // Managers and Admins see everything
            $query = "
                SELECT i.*, d.site_name, u.full_name as logged_by 
                FROM client_inquiries i 
                INNER JOIN domains d ON i.domain_id = d.id 
                INNER JOIN users u ON i.user_id = u.id 
                ORDER BY i.inquiry_date DESC, i.created_at DESC
            ";
            $stmt = $conn->query($query);
        } else {
            // IT Staff only see inquiries for domains they are assigned to
            $query = "
                SELECT i.*, d.site_name, u.full_name as logged_by 
                FROM client_inquiries i 
                INNER JOIN domains d ON i.domain_id = d.id 
                INNER JOIN users u ON i.user_id = u.id 
                INNER JOIN inquiry_assignments ia ON d.id = ia.domain_id 
                WHERE ia.user_id = ? 
                ORDER BY i.inquiry_date DESC, i.created_at DESC
            ";
            $stmt = $conn->prepare($query);
            $stmt->execute([$currentUser['id']]);
        }
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

// Log a New Inquiry or Edit
if ($action === 'save_inquiry' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireAuth();
    $data = json_decode(file_get_contents("php://input"), true);
    $inqId = (int)($data['id'] ?? 0);
    
    // STRICT ENFORCEMENT: IT staff cannot edit existing inquiries. Admins and Managers CAN.
    if ($inqId > 0 && !in_array($currentUser['role'], ['admin', 'manager'])) {
        echo json_encode(["status" => "error", "message" => "Security Policy: You do not have permission to modify committed inquiries."]);
        exit();
    }

    try {
        if ($inqId > 0) {
            $stmt = $conn->prepare("UPDATE client_inquiries SET domain_id=?, client_name=?, safari_type=?, phone_number=?, inquiry_source=?, inquiry_date=? WHERE id=?");
            $stmt->execute([$data['domain_id'], $data['client_name'], $data['safari_type'], $data['phone_number'], $data['inquiry_source'], $data['inquiry_date'], $inqId]);
            writeAuditLog($currentUser['id'], $currentUser['username'], $currentUser['role'], 'INQUIRY_EDIT', "Modified inquiry #$inqId for client: " . $data['client_name']);
        } else {
            $stmt = $conn->prepare("INSERT INTO client_inquiries (domain_id, user_id, client_name, safari_type, phone_number, inquiry_source, inquiry_date) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$data['domain_id'], $currentUser['id'], $data['client_name'], $data['safari_type'], $data['phone_number'], $data['inquiry_source'], $data['inquiry_date']]);
            writeAuditLog($currentUser['id'], $currentUser['username'], $currentUser['role'], 'INQUIRY_LOGGED', "Logged new " . $data['inquiry_source'] . " inquiry for: " . $data['client_name']);
        }
        echo json_encode(["status" => "success"]);
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

// Delete Inquiry (Admin Only)
if ($action === 'delete_inquiry' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireRoles(['admin']); // This correctly prevents Managers from deleting
    $data = json_decode(file_get_contents("php://input"), true);
    
    try {
        $conn->prepare("DELETE FROM client_inquiries WHERE id=?")->execute([(int)$data['id']]);
        writeAuditLog($currentUser['id'], $currentUser['username'], $currentUser['role'], 'INQUIRY_DELETED', "Purged inquiry ID: " . $data['id']);
        echo json_encode(["status" => "success"]);
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

// Fetch Admin Assignments mapping (Only admins can assign)
if ($action === 'fetch_admin_inquiry_assignments') {
    requireRoles(['admin']);
    try {
        // STRICT ENFORCEMENT: ONLY fetch users with the role 'it_staff'
        $staffStmt = $conn->query("SELECT id, full_name, username FROM users WHERE user_role = 'it_staff' AND is_deleted = 0 ORDER BY full_name ASC");
        $staff = $staffStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get assignments mapped to them
        foreach ($staff as &$person) {
            $astmt = $conn->prepare("SELECT d.id, d.site_url FROM inquiry_assignments ia INNER JOIN domains d ON ia.domain_id = d.id WHERE ia.user_id = ?");
            $astmt->execute([$person['id']]);
            $person['assigned_domains'] = $astmt->fetchAll(PDO::FETCH_ASSOC);
        }
        echo json_encode(["status" => "success", "data" => $staff]);
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

// Assign a domain to an IT person
if ($action === 'save_inquiry_assignment' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireRoles(['admin']);
    $data = json_decode(file_get_contents("php://input"), true);
    try {
        $conn->prepare("INSERT IGNORE INTO inquiry_assignments (user_id, domain_id) VALUES (?, ?)")->execute([(int)$data['user_id'], (int)$data['domain_id']]);
        echo json_encode(["status" => "success"]);
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

// Remove domain assignment
if ($action === 'remove_inquiry_assignment' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireRoles(['admin']);
    $data = json_decode(file_get_contents("php://input"), true);
    try {
        $conn->prepare("DELETE FROM inquiry_assignments WHERE user_id = ? AND domain_id = ?")->execute([(int)$data['user_id'], (int)$data['domain_id']]);
        echo json_encode(["status" => "success"]);
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

?>