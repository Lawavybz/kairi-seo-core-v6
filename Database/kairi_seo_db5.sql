-- =========================================================================
-- KAIRI SEO CORE v6 - FULL UNIFIED DATABASE SCHEMA (kairi_seo_db5)
-- =========================================================================
CREATE DATABASE IF NOT EXISTS kairi_seo_db5 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kairi_seo_db5;

-- -------------------------------------------------------------------------
-- SAFETY RESET: WIPE OLD STRUCTURES OUT IN STRICT DEPENDENCY ORDER
-- -------------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS login_attempts;
DROP TABLE IF EXISTS daily_duties;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS rank_logs;
DROP TABLE IF EXISTS tenant_keywords;
DROP TABLE IF EXISTS client_inquiries;
DROP TABLE IF EXISTS inquiry_assignments;
DROP TABLE IF EXISTS domains;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- -------------------------------------------------------------------------
-- PART 1: CORE SECURITY & ACCESS CONTROL TABLES
-- -------------------------------------------------------------------------

-- 1A. User Profiles & Role Provisioning Registry
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    user_role ENUM('admin', 'it_staff', 'manager', 'user') NOT NULL,
    is_active TINYINT DEFAULT 1,
    is_deleted TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 1B. Brute Force & Rate Limiting Tracker
CREATE TABLE login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 1C. Professional Change & Database Activity Ledger (Audit Log)
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    username VARCHAR(50) NOT NULL,
    user_role VARCHAR(20) NOT NULL,
    action_performed VARCHAR(100) NOT NULL,
    context_details TEXT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    is_read TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -------------------------------------------------------------------------
-- PART 2: MULTI-TENANT WORKSPACE TABLES
-- -------------------------------------------------------------------------

-- 2A. Tenants Registry (Domains)
CREATE TABLE domains (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_name VARCHAR(100) NOT NULL,
    site_url VARCHAR(255) NOT NULL UNIQUE,
    is_deleted TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2B. Decoupled Keywords Registry (Fully independent per domain instance)
CREATE TABLE tenant_keywords (
    id INT AUTO_INCREMENT PRIMARY KEY,
    domain_id INT NOT NULL,
    book_category ENUM('black', 'green') NOT NULL,
    keyword_phrase VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_keyword_tenant FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
    UNIQUE KEY unique_phrase_per_site_tenant (domain_id, keyword_phrase)
) ENGINE=InnoDB;

-- 2C. Isolated Performance Logs
CREATE TABLE rank_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    domain_id INT NOT NULL,
    keyword_id INT NOT NULL,
    evaluation_date DATE NOT NULL,
    page_rank INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_tenant_domain FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
    CONSTRAINT fk_log_tenant_keyword FOREIGN KEY (keyword_id) REFERENCES tenant_keywords(id) ON DELETE CASCADE,
    UNIQUE KEY unique_entry_per_tenant_keyword_day (domain_id, keyword_id, evaluation_date)
) ENGINE=InnoDB;

-- 2D. Daily Property Allocation Board (Duties Management)
CREATE TABLE daily_duties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    domain_id INT NOT NULL,
    book_category ENUM('green', 'black') NOT NULL DEFAULT 'green',
    duty_date DATE NOT NULL,
    status ENUM('Pending', 'Complete') NOT NULL DEFAULT 'Pending',
    assigned_by_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT fk_duty_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_duty_domain FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
    CONSTRAINT fk_duty_assigner FOREIGN KEY (assigned_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_assignment_book_per_day (user_id, domain_id, book_category, duty_date)
) ENGINE=InnoDB;

-- -------------------------------------------------------------------------
-- PART 3: INQUIRIES & LEAD PERFORMANCE MODULE
-- -------------------------------------------------------------------------

-- 3A. IT Staff Inquiry Management Assignments
CREATE TABLE inquiry_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    domain_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inq_assign_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_inq_assign_domain FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_domain_assignment (user_id, domain_id)
) ENGINE=InnoDB;

-- 3B. Client Safari Inquiries Ledger
CREATE TABLE client_inquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    domain_id INT NOT NULL,
    user_id INT NOT NULL, -- The IT staff member who logged it
    client_name VARCHAR(150) NOT NULL,
    safari_type VARCHAR(150) NOT NULL,
    phone_number VARCHAR(50),
    inquiry_source ENUM('Email', 'WhatsApp') NOT NULL,
    inquiry_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inq_domain FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
    CONSTRAINT fk_inq_logger FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;