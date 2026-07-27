// auth_app.js - Consolidated Enterprise Access Security & View Routing Controller

let sessionTimeoutTimer;
let sessionWarningTimer;
const LOGOUT_TIME_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME_MS = 28 * 60 * 1000; // 28 minutes

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("authCoreLoginForm").addEventListener("submit", executeAuthenticationPipeline);
    const datePicker = document.getElementById("dutyScheduleDatePicker");
    if (datePicker) datePicker.value = new Date().toISOString().split('T')[0];

    const themeToggleBtn = document.getElementById("themeToggleBtn");
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", () => {
            if (document.documentElement.classList.contains('dark')) {
                localStorage.theme = 'light';
                applyGlobalAppTheme('light');
            } else {
                localStorage.theme = 'dark';
                applyGlobalAppTheme('dark');
            }
        });
    }

    if (localStorage.theme === 'light') applyGlobalAppTheme('light');
    else { applyGlobalAppTheme('dark'); localStorage.theme = 'dark'; }

    const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
    const sidebarDock = document.getElementById("sidebarDock");
    if (sidebarToggleBtn && sidebarDock) {
        sidebarToggleBtn.addEventListener("click", function (event) {
            event.stopPropagation();
            if (sidebarDock.classList.contains("-translate-x-full")) {
                sidebarDock.classList.remove("-translate-x-full");
                sidebarDock.classList.add("translate-x-0");
            } else {
                sidebarDock.classList.remove("translate-x-0");
                sidebarDock.classList.add("-translate-x-full");
            }
        });

        document.addEventListener("click", function (event) {
            if (window.innerWidth < 768) {
                const clickedInsideSidebar = sidebarDock.contains(event.target);
                const clickedToggleButton = (event.target === sidebarToggleBtn || sidebarToggleBtn.contains(event.target));
                if (!clickedInsideSidebar && !clickedToggleButton) {
                    sidebarDock.classList.remove("translate-x-0");
                    sidebarDock.classList.add("-translate-x-full");
                }
            }
        });
    }

    const togglePasswordBtn = document.getElementById("togglePasswordVisibilityBtn");
    const loginPasswordInput = document.getElementById("loginPassword");
    if (togglePasswordBtn && loginPasswordInput) {
        togglePasswordBtn.addEventListener("click", function () {
            if (loginPasswordInput.type === "password") {
                loginPasswordInput.type = "text";
                this.innerText = "HIDE";
            } else {
                loginPasswordInput.type = "password";
                this.innerText = "SHOW";
            }
        });
    }

    const forgotPasswordLink = document.getElementById("forgotPasswordLink");
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener("click", function (e) {
            e.preventDefault();
            Swal.fire({
                title: 'Reset Credentials',
                text: 'Enter your username to notify the System Administrator:',
                input: 'text',
                inputPlaceholder: 'Username...',
                showCancelButton: true,
                confirmButtonColor: '#F3862A',
                confirmButtonText: 'Send Request'
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    fetch('api.php?action=trigger_forgot_password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: result.value })
                    }).then(res => res.json()).then(data => {
                        Swal.fire('Request Sent', 'The System Administrator has been notified of your password reset request.', 'success');
                    });
                }
            });
        });
    }

    // Bind Session Timeout Listeners
    ['mousemove', 'keydown', 'scroll', 'click'].forEach(evt => {
        document.addEventListener(evt, resetSessionTimers);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
    verifySystemSessionContext();
    startLiveSystemClock();
});

// ==========================================================================
// SESSION TIMEOUT & INACTIVITY MANAGEMENT
// ==========================================================================
function resetSessionTimers() {
    if (typeof activeSessionUser === 'undefined' || !activeSessionUser) return;

    clearTimeout(sessionWarningTimer);
    clearTimeout(sessionTimeoutTimer);

    sessionWarningTimer = setTimeout(() => {
        const isDark = document.documentElement.classList.contains('dark');
        Swal.fire({
            title: 'Session Expiring Soon',
            text: 'Your corporate session will expire in 2 minutes due to inactivity.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Keep Me Logged In',
            cancelButtonText: 'Log Out Now',
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#ef4444',
            background: isDark ? '#111827' : '#ffffff',
            color: isDark ? '#f3f4f6' : '#1e293b'
        }).then((result) => {
            if (result.isConfirmed) {
                fetch('api.php?action=check_session').then(() => resetSessionTimers());
            } else if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
                triggerSystemLogoutSequence(true);
            }
        });
    }, WARNING_TIME_MS);

    sessionTimeoutTimer = setTimeout(() => {
        fetch('api.php?action=logout').then(() => {
            activeSessionUser = null;
            window.location.reload();
        });
    }, LOGOUT_TIME_MS);
}

function applyGlobalAppTheme(theme) {
    const themeIcon = document.getElementById("themeIcon");
    const themeText = document.getElementById("themeText");

    if (theme === 'light') {
        document.documentElement.classList.remove('dark');
        if (themeIcon) themeIcon.setAttribute("data-lucide", "sun");
        if (themeText) themeText.innerText = "Light Mode";
    } else {
        document.documentElement.classList.add('dark');
        if (themeIcon) themeIcon.setAttribute("data-lucide", "moon");
        if (themeText) themeText.innerText = "Dark Mode";
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
    if (typeof updateChartsDisplay === "function") updateChartsDisplay();
}

function verifySystemSessionContext() {
    fetch('api.php?action=check_session')
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success' && res.user) bootstrapAuthenticatedWorkspace(res.user);
            else isolateLoginScreenState(true);
        }).catch(() => isolateLoginScreenState(true));
}

function isolateLoginScreenState(shouldReveal) {
    const gateway = document.getElementById("secureAuthAuthWrapper");
    const appShell = document.getElementById("enterpriseMasterApplicationContainer");
    if (gateway) shouldReveal ? gateway.classList.remove("hidden") : gateway.classList.add("hidden");
    if (appShell) shouldReveal ? appShell.classList.add("hidden") : appShell.classList.remove("hidden");
}

function executeAuthenticationPipeline(e) {
    e.preventDefault();
    const username = document.getElementById("loginUsername").value.trim();
    const pass = document.getElementById("loginPassword").value;

    // Add visual loading spinner feedback directly to the button
    const submitBtn = document.querySelector("#authCoreLoginForm button[type='submit']");
    const originalText = submitBtn.innerText;
    submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline-block mr-2"></i> Authenticating...`;
    submitBtn.disabled = true;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    fetch('api.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: pass })
    })
        .then(res => res.json())
        .then(res => {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;

            if (res.status === 'success') {
                bootstrapAuthenticatedWorkspace(res.user);
                Swal.fire({ title: 'Access Signature Verified', text: `Welcome back, ${res.user.full_name}`, icon: 'success', timer: 1500, showConfirmButton: false });
            } else {
                Swal.fire({ title: 'Access Denied', text: res.message, icon: 'error', confirmButtonColor: '#F3862A' });
            }
        })
        .catch(err => {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
            Swal.fire({ title: 'Network Error', text: 'Failed to contact authentication server.', icon: 'error' });
        });
}

function triggerSystemLogoutSequence(force = false) {
    if (force) {
        fetch('api.php?action=logout').then(() => {
            activeSessionUser = null;
            window.location.reload();
        });
        return;
    }

    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = isDark ? '#111827' : '#ffffff';
    const textColor = isDark ? '#f3f4f6' : '#1e293b';

    Swal.fire({
        title: 'Terminate Session?',
        text: "You are about to log out of the enterprise console.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#059669', cancelButtonColor: '#e11d48', confirmButtonText: 'Yes, log out', cancelButtonText: 'Cancel',
        background: bgColor, color: textColor,
        customClass: { title: 'font-mono tracking-wide', htmlContainer: 'font-mono text-sm' }
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('api.php?action=logout').then(() => {
                activeSessionUser = null;
                window.location.reload();
            });
        }
    });
}

// ==========================================================================
// ROLE-BASED NAVIGATION ROUTING LOGIC
// ==========================================================================
function bootstrapAuthenticatedWorkspace(userProfile) {
    activeSessionUser = userProfile;
    resetSessionTimers(); // Start background timeout monitoring
    isolateLoginScreenState(false);

    const displayName = userProfile.full_name || userProfile.username || "Unknown User";
    const displayRole = userProfile.role || userProfile.user_role || "USER";
    const userRoleStr = displayRole.toLowerCase();

    document.getElementById("topUserName").innerText = displayName;
    document.getElementById("topUserRole").innerText = displayRole.replace('_', ' ');
    document.getElementById("topUserInitials").innerText = displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

    // Sidebar Node References
    const adminBlock = document.getElementById("systemAdministrationSidebarSection");
    const navDashboard = document.getElementById("nav-dashboard");
    const navDomains = document.getElementById("nav-domains");
    const navUsers = document.getElementById("nav-users");
    const navLogs = document.getElementById("nav-logs");
    const navConfig = document.getElementById("nav-config");

    // Top Header Node References
    const topHeaderInquiriesBtn = document.getElementById("topHeaderInquiriesBtn");

    // Start by hiding ALL restricted elements
    if (navDashboard) navDashboard.style.display = "none";
    if (adminBlock) adminBlock.style.display = "none";
    if (navDomains) navDomains.style.display = "none";
    if (navUsers) navUsers.style.display = "none";
    if (navLogs) navLogs.style.display = "none";
    if (navConfig) navConfig.style.display = "none";
    if (topHeaderInquiriesBtn) topHeaderInquiriesBtn.style.display = "none";

    if (userRoleStr === 'admin') {
        if (navDashboard) navDashboard.style.display = "flex";
        if (adminBlock) adminBlock.style.display = "block";
        if (navDomains) navDomains.style.display = "flex";
        if (navUsers) navUsers.style.display = "flex";
        if (navLogs) navLogs.style.display = "flex";
        if (navConfig) navConfig.style.display = "flex";
        if (topHeaderInquiriesBtn) topHeaderInquiriesBtn.style.display = "flex"; // Show for admin
    }
    else if (userRoleStr === 'manager') {
        if (navDashboard) navDashboard.style.display = "flex";
        if (adminBlock) adminBlock.style.display = "block";
        if (navUsers) navUsers.style.display = "flex"; // Can see users
        if (navConfig) navConfig.style.display = "flex"; // Can config keywords
        if (topHeaderInquiriesBtn) topHeaderInquiriesBtn.style.display = "flex"; // Show for manager
        // Tenant Properties & System Logs remain hidden
    }
    else if (userRoleStr === 'it_staff') {
        if (navDashboard) navDashboard.style.display = "flex";
        if (adminBlock) adminBlock.style.display = "block";
        if (navUsers) navUsers.style.display = "flex"; // Can see users
        if (navLogs) navLogs.style.display = "flex"; // Can see system logs
        if (topHeaderInquiriesBtn) topHeaderInquiriesBtn.style.display = "flex"; // Show for it_staff
        // Tenant Properties & Keyword Config remain hidden
    }
    else if (userRoleStr === 'user') {
        // Users: Hide dashboard completely from sidebar
        if (navDashboard) navDashboard.style.display = "none";
        if (topHeaderInquiriesBtn) topHeaderInquiriesBtn.style.display = "none"; // STRICT ENFORCEMENT: Never show for users

        const titleText = document.getElementById("navDutiesTitleText");
        const instText = document.getElementById("dutyBoardInstructionsText");
        if (titleText) titleText.innerText = "My Daily Workspaces";
        if (instText) instText.innerText = "Review the property workspaces assigned to you for search rank matrix sweeps today.";
        const quickPasteUI = document.getElementById("quickPasteWrapperUI");
        if (quickPasteUI) quickPasteUI.classList.remove("hidden");
    }

    loadGlobalTenantProperties();
}

function loadGlobalTenantProperties() {
    fetch('api.php?action=fetch_domains')
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success') {
                corporateDomainsList = res.data;
                renderDynamicSidebarProperties();
                populateDomainDropdowns();

                const sitesCountNode = document.getElementById("dashboardActiveSitesCount");
                if (sitesCountNode) sitesCountNode.innerText = `${corporateDomainsList.length} Properties`;

                // Route safely depending on role
                const startingView = activeSessionUser.role === 'user' ? 'duties' : 'dashboard';

                if (typeof syncActiveTenantKeywords === "function") {
                    syncActiveTenantKeywords(activeDomainId, () => switchViewMode(startingView));
                } else {
                    switchViewMode(startingView);
                }
            }
        });
}

function populateDomainDropdowns() {
    const singleSelect = document.getElementById("configClusterTargetDomain");
    const batchContainer = document.getElementById("batchDomainsCheckboxContainer");
    if (singleSelect) singleSelect.innerHTML = corporateDomainsList.map(d => `<option value="${d.id}">${d.site_url}</option>`).join('');
    if (batchContainer) {
        batchContainer.innerHTML = corporateDomainsList.map(d => `
            <label class="flex items-center gap-2.5 text-xs font-mono cursor-pointer">
                <input type="checkbox" name="batch_domains[]" value="${d.id}" class="rounded text-blue-500 bg-white dark:bg-gray-950"> 
                <span>${d.site_url}</span>
            </label>
        `).join('');
    }
}

// ==========================================================================
// Interactive Notification Center Triggered by the Notification Bell Icon
// ==========================================================================
function triggerNotificationCenter() {
    const badge = document.getElementById("notificationBadgeCount");
    if (badge) badge.classList.add("hidden");

    fetch('api.php?action=fetch_notifications')
        .then(res => res.json())
        .then(res => {
            let itemsHTML = '';
            let modalTitle = '🔔 System Notifications';

            if (activeSessionUser.role === 'user') modalTitle = '📋 My Assigned Tasks';
            else if (['admin', 'it_staff'].includes(activeSessionUser.role)) modalTitle = '🔑 Password Reset Requests';
            else if (activeSessionUser.role === 'manager') modalTitle = '✅ Completed Tasks Log';

            if (res.status === 'success' && res.data.length > 0) {
                const activeData = res.data.filter(item => item.is_read != 1);

                if (activeData.length === 0) {
                    itemsHTML = `<p class="text-center text-slate-400 italic">No unread notifications.</p>`;
                } else {
                    if (res.type === 'user_tasks') {
                        activeData.forEach(task => {
                            const isComplete = task.status === 'Complete';
                            const badgeStyle = isComplete ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' : 'text-amber-500 bg-amber-50 dark:bg-amber-950/40';

                            itemsHTML += `
                                <div class="p-3 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl space-y-1">
                                    <div class="flex justify-between items-center text-[10px] text-slate-400">
                                        <span class="uppercase font-bold">${task.book_category} Book</span>
                                        <span class="px-1.5 py-0.5 rounded font-bold uppercase ${badgeStyle}">${task.status}</span>
                                    </div>
                                    <p class="text-slate-800 dark:text-gray-200 font-bold text-xs">Assigned Workspace: ${task.site_name}</p>
                                </div>
                            `;
                        });
                    } else {
                        activeData.forEach(log => {
                            let badgeColor = 'text-blue-500 bg-blue-50 dark:bg-blue-950/40';
                            if (log.action_performed === 'SAVE_RANK_MATRIX') badgeColor = 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40';
                            if (log.action_performed === 'FORGOT_PASSWORD_REQUEST') badgeColor = 'text-rose-500 bg-rose-50 dark:bg-rose-950/40';

                            itemsHTML += `
                                <div class="p-3 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl space-y-2 flex items-start justify-between gap-2" id="notification-item-${log.id}">
                                    <div class="space-y-1 flex-1">
                                        <div class="flex justify-between items-center text-[10px] text-slate-400">
                                            <span>${log.created_at}</span>
                                            <span class="px-1.5 py-0.5 rounded font-bold uppercase ${badgeColor}">${log.action_performed.replace(/_/g, ' ')}</span>
                                        </div>
                                        <p class="text-slate-800 dark:text-gray-200 font-bold text-xs">${log.context_details}</p>
                                    </div>
                                    <button onclick="dismissNotificationItem(${log.id})" class="text-slate-400 hover:text-rose-500 transition p-1" title="Dismiss">
                                        <i data-lucide="x" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            `;
                        });
                    }
                }
            } else {
                itemsHTML = `<p class="text-center text-slate-400 italic">No new notifications.</p>`;
            }

            Swal.fire({
                title: modalTitle,
                html: `<div class="text-left font-mono text-xs space-y-3 max-h-80 overflow-y-auto">${itemsHTML}</div>`,
                showDenyButton: activeSessionUser.role !== 'user',
                denyButtonText: 'Mark All as Read',
                confirmButtonColor: '#10b981',
                confirmButtonText: 'Close',
                denyButtonColor: '#64748b',
                customClass: { popup: 'dark:bg-gray-900 dark:border dark:border-gray-800', title: 'dark:text-white' },
                didOpen: () => { if (typeof lucide !== 'undefined') lucide.createIcons(); }
            }).then((result) => {
                if (result.isDenied) {
                    fetch('api.php?action=mark_notification_read', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 0 })
                    }).then(() => { SystemToast.fire({ icon: 'success', title: 'All notifications cleared' }); });
                }
            });
        });
}

function dismissNotificationItem(logId) {
    fetch('api.php?action=mark_notification_read', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: logId })
    }).then(res => res.json()).then(data => {
        if (data.status === 'success') {
            const element = document.getElementById(`notification-item-${logId}`);
            if (element) {
                element.style.transition = 'all 0.3s ease';
                element.style.opacity = '0';
                setTimeout(() => element.remove(), 300);
            }
            SystemToast.fire({ icon: 'success', title: 'Notification dismissed' });
        }
    });
}

function renderDynamicSidebarProperties() {
    const container = document.getElementById("dynamicSidebarPropertiesWrapper");
    if (!container) return;
    container.innerHTML = "";
    corporateDomainsList.forEach(domain => {
        const btn = document.createElement("button");
        btn.id = `nav-prop-${domain.id}`;
        btn.onclick = () => switchViewMode('property', domain.id);
        btn.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-mono text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-900 transition-all";
        btn.innerHTML = `<i data-lucide="globe" class="w-4 h-4 text-emerald-500"></i><span>${domain.site_url}</span>`;
        container.appendChild(btn);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function switchViewMode(targetView, propertyId = null) {
    if (activeSessionUser && activeSessionUser.role === 'user' && targetView === 'dashboard') {
        targetView = 'duties';
    }

    activeViewMode = targetView;
    const views = {
        'dashboard': document.getElementById("enterpriseDashboardSection"),
        'duties': document.getElementById("dutiesManagementSection"),
        'property': document.getElementById("individualPropertyWorkspaceSection"),
        'users': document.getElementById("userManagementSection"),
        'logs': document.getElementById("systemChangeLogsSection"),
        'config': document.getElementById("systemConfigurationSection"),
        'domains': document.getElementById("tenantPropertiesSection"),
        'inquiries': document.getElementById("inquiriesManagementSection")
    };

    Object.keys(views).forEach(k => {
        if (views[k]) {
            if (k === targetView) views[k].classList.remove("hidden");
            else views[k].classList.add("hidden");
        }
    });

    // Strict Cleanup: Ensure sidebar navigation buttons drop active highlight states
    document.querySelectorAll("aside nav button").forEach(b => {
        b.classList.remove("bg-emerald-600", "text-white", "dark:text-gray-950", "font-bold", "shadow-md");
        b.classList.add("text-slate-600", "dark:text-gray-400", "hover:bg-slate-100", "dark:hover:bg-gray-900");
    });

    // Strict Cleanup: Ensure Inquiries button stays hidden for user role across all view transitions
    const inquiriesBtn = document.getElementById("topHeaderInquiriesBtn");
    if (inquiriesBtn) {
        if (activeSessionUser && activeSessionUser.role === 'user') {
            inquiriesBtn.style.display = "none";
        } else {
            inquiriesBtn.style.display = "flex";
        }
    }

    function setActiveNav(navId) {
        const nav = document.getElementById(navId);
        if (nav) {
            nav.classList.remove("text-slate-600", "dark:text-gray-400", "hover:bg-slate-100", "dark:hover:bg-gray-900");
            nav.classList.add("bg-emerald-600", "text-white", "dark:text-gray-950", "font-bold", "shadow-md");
        }
    }

    const title = document.getElementById("viewTitleHeader");
    const subtitle = document.getElementById("viewSubtitleHeader");

    if (targetView === 'dashboard') {
        setActiveNav("nav-dashboard");
        if (title) title.innerText = "GLOBAL ENTERPRISE DASHBOARD";
        if (subtitle) subtitle.innerText = "Aggregated Cross-Domain Search Analysis Core View";

        const sitesCountNode = document.getElementById("dashboardActiveSitesCount");
        if (sitesCountNode && typeof corporateDomainsList !== 'undefined') {
            sitesCountNode.innerText = `${corporateDomainsList.length} Properties`;
        }
        if (typeof loadEnterpriseDomains === "function") loadEnterpriseDomains();
    }
    else if (targetView === 'duties') {
        setActiveNav("nav-duties");
        if (title) title.innerText = "DAILY OPERATION ROUTING BOARD";
        if (subtitle) subtitle.innerText = "Strategic Workflow Task Assignment Allocations Interface";
        loadDutiesConfigurationRegistry();
    }
    else if (targetView === 'users') {
        setActiveNav("nav-users");
        if (title) title.innerText = "IDENTITY PROFILE ACCESS CONTROL BOARD";
        if (subtitle) subtitle.innerText = "Manage Corporate Access and Role Configurations";
        loadCorporateUsersRegistry();
    }
    else if (targetView === 'domains') {
        setActiveNav("nav-domains");
        if (title) title.innerText = "TENANT PROPERTIES WORKSPACE EXECUTIVE";
        if (subtitle) subtitle.innerText = "Create, Alter, and Synchronize Corporate Domain Endpoints";
        loadTenantDomainsRegistry();
    }
    else if (targetView === 'logs') {
        setActiveNav("nav-logs");
        if (title) title.innerText = "IMMUTABLE AUDIT TRANSACTION STREAM";
        if (subtitle) subtitle.innerText = "Professional Database Tracking Activity Stream Log Monitor";
        loadSystemAuditStreamLogs();
    }
    else if (targetView === 'config') {
        setActiveNav("nav-config");
        if (title) title.innerText = "KEYWORD ENGINE MASTER MANAGER";
        if (subtitle) subtitle.innerText = "Non-Technical Optimization Strategy Control Board Panel Hub";
        if (typeof populateConfigManagerFields === "function") populateConfigManagerFields();
    }
    else if (targetView === 'property' && propertyId) {
        activeDomainId = propertyId;
        setActiveNav(`nav-prop-${propertyId}`);

        const matchedObj = corporateDomainsList.find(d => d.id == propertyId);
        if (title) title.innerText = matchedObj ? matchedObj.site_name.toUpperCase() : "PROPERTY MONITOR WORKSPACE";
        if (subtitle) subtitle.innerText = `Workspace Environment Engine Context: ${matchedObj ? matchedObj.site_url : ''}`;

        const modeToggle = document.getElementById("workspaceModeControlsToggle");

        if (activeSessionUser && activeSessionUser.role === 'user') {
            if (typeof setWorkspaceOperationMode === "function") setWorkspaceOperationMode('edit');
            if (modeToggle) modeToggle.classList.add("hidden");
        } else if (activeSessionUser && activeSessionUser.role === 'it_staff') {
            if (typeof setWorkspaceOperationMode === "function") setWorkspaceOperationMode('view');
            if (modeToggle) modeToggle.classList.add("hidden");
        } else {
            if (typeof setWorkspaceOperationMode === "function") setWorkspaceOperationMode('view');
            if (modeToggle) modeToggle.classList.remove("hidden");
        }

        if (typeof loadDatabaseRecords === "function") loadDatabaseRecords();
    }
    else if (targetView === 'inquiries') {
        if (title) title.innerText = "INQUIRIES DESK";
        if (subtitle) subtitle.innerText = "Track and Manage Client Safari Conversions";
        loadInquiriesPerformanceBoard();
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function loadSystemAuditStreamLogs() {
    const tbody = document.querySelector("#systemAuditLogsStreamTable tbody");
    if (!tbody) return;

    fetch('api.php?action=fetch_audit_logs')
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success') {
                tbody.innerHTML = "";
                res.data.forEach(log => {
                    const tr = document.createElement("tr");
                    tr.className = "hover:bg-slate-100 dark:hover:bg-gray-900/40 border-b border-slate-200 dark:border-gray-850 font-mono text-[11px]";
                    tr.innerHTML = `
                        <td class="p-3 text-slate-400">${log.created_at}</td>
                        <td class="p-3 font-bold text-slate-800 dark:text-gray-200">${log.username}</td>
                        <td class="p-3"><span class="px-1 bg-slate-100 border text-slate-500 rounded text-[10px] uppercase">${log.user_role}</span></td>
                        <td class="p-3 text-blue-500 font-bold">${log.action_performed}</td>
                        <td class="p-3 max-w-xs truncate text-slate-500" title="${log.context_details}">${log.context_details}</td>
                        <td class="p-3 text-right text-slate-400">${log.ip_address}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        });
}

function loadCorporateUsersRegistry() {
    const tbody = document.querySelector("#corporateUsersRegistryTable tbody");
    if (!tbody) return;

    const isIT = activeSessionUser && activeSessionUser.role === 'it_staff';
    const registerBtn = document.querySelector("#userManagementSection button[onclick*='triggerUserCreationModal']");
    if (registerBtn) {
        if (isIT || activeSessionUser.role === 'user') registerBtn.classList.add("hidden");
        else registerBtn.classList.remove("hidden");
    }

    fetch('api.php?action=fetch_users')
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success') {
                tbody.innerHTML = "";
                res.data.forEach(user => {
                    const canEdit = !(isIT && (user.user_role === 'admin' || user.user_role === 'manager'));

                    const tr = document.createElement("tr");
                    tr.className = "hover:bg-slate-50 dark:hover:bg-gray-900/30 border-b border-slate-200 dark:border-gray-850 text-xs text-slate-700 dark:text-gray-300";
                    tr.innerHTML = `
                        <td class="p-4 font-bold text-slate-900 dark:text-white">${user.full_name}</td>
                        <td class="p-4 font-mono text-slate-400">${user.username}</td>
                        <td class="p-4"><span class="px-2 py-0.5 font-bold font-mono text-[10px] bg-blue-50 border border-blue-200 text-blue-600 rounded uppercase tracking-wider">${user.user_role}</span></td>
                        <td class="p-4 text-right flex justify-end gap-2">
                            ${canEdit ? `<button onclick="triggerUserEditPipeline(${JSON.stringify(user).replace(/"/g, '&quot;')})" class="p-1 text-blue-500 hover:underline">Edit</button>` : '<span class="text-slate-400 italic font-mono text-[10px] pt-1">LOCKED</span>'}
                            ${activeSessionUser.role === 'admin' ? `<button onclick="executeUserDeletionSequence(${user.id})" class="p-1 text-red-500 hover:underline">Delete</button>` : ''}
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        });
}

function loadTenantDomainsRegistry() {
    const tbody = document.querySelector("#tenantDomainsRegistryTable tbody");
    if (!tbody) return;

    fetch('api.php?action=fetch_domains')
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success') {
                tbody.innerHTML = "";
                res.data.forEach(domain => {
                    const tr = document.createElement("tr");
                    tr.className = "hover:bg-slate-50 dark:hover:bg-gray-900/30 border-b border-slate-200 dark:border-gray-850 text-xs text-slate-700 dark:text-gray-300";
                    tr.innerHTML = `
                        <td class="p-4 font-mono font-bold text-slate-400">${domain.id}</td>
                        <td class="p-4 font-bold text-slate-900 dark:text-white">${domain.site_name}</td>
                        <td class="p-4 font-mono text-blue-600 dark:text-blue-400">${domain.site_url}</td>
                        <td class="p-4 text-right flex justify-end gap-2">
                            <button onclick='triggerDomainEditPipeline(${JSON.stringify(domain).replace(/"/g, '&quot;')})' class="p-1 text-purple-500 hover:underline">Edit</button>
                            <button onclick="executeDomainDeletionSequence(${domain.id})" class="p-1 text-red-500 hover:underline">Remove</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        });
}

function triggerDomainCreationModal() {
    triggerDomainModificationPopup({ id: 0, site_name: '', site_url: '' });
}

function triggerDomainEditPipeline(domainObj) {
    triggerDomainModificationPopup(domainObj);
}

function triggerDomainModificationPopup(domain) {
    Swal.fire({
        title: domain.id === 0 ? 'Register Tenant Workspace' : 'Modify Property Workspace',
        html: `
            <div class="text-left space-y-3 font-mono text-xs">
                <label class="block font-bold">Site Identification Title</label>
                <input id="swalDomainName" class="w-full p-2.5 bg-slate-50 border rounded dark:bg-gray-900 text-sm" value="${domain.site_name}" placeholder="e.g. Luxury Camp Context">
                <label class="block font-bold">Endpoint Root Target URL</label>
                <input id="swalDomainUrl" class="w-full p-2.5 bg-slate-50 border rounded dark:bg-gray-900 text-sm" value="${domain.site_url}" placeholder="e.g. domain.com">
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#a855f7',
        confirmButtonText: 'Commit Property Strategy',
        preConfirm: () => {
            return {
                id: domain.id,
                site_name: document.getElementById("swalDomainName").value.trim(),
                site_url: document.getElementById("swalDomainUrl").value.trim()
            }
        }
    }).then(res => {
        if (res.isConfirmed && res.value) {
            fetch('api.php?action=save_domain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(res.value)
            }).then(r => r.json()).then(data => {
                if (data.status === 'success') {
                    loadGlobalTenantProperties();
                    if (activeViewMode === 'domains') loadTenantDomainsRegistry();
                    Swal.fire('Committed', 'Property structural modifications deployed.', 'success');
                } else {
                    Swal.fire('Transaction Terminated', data.message, 'error');
                }
            });
        }
    });
}

function executeDomainDeletionSequence(dId) {
    Swal.fire({
        title: 'Purge Tenant Property?',
        text: "Warning: Removing this profile automatically drops all cascading keywords and log records attached to this host mapping space.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444'
    }).then(res => {
        if (res.isConfirmed) {
            fetch('api.php?action=delete_domain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: dId })
            }).then(r => r.json()).then(data => {
                if (data.status === 'success') {
                    loadGlobalTenantProperties();
                    if (activeViewMode === 'domains') loadTenantDomainsRegistry();
                    Swal.fire('Purged', 'Domain structure wiped completely.', 'success');
                } else {
                    Swal.fire('Error', data.message, 'error');
                }
            });
        }
    });
}

function loadDutiesConfigurationRegistry() {
    const sectionContainer = document.getElementById("dutiesManagementSection");
    if (!sectionContainer) return;

    const datePicker = document.getElementById("dutyScheduleDatePicker");
    const pickedDate = datePicker ? datePicker.value : new Date().toISOString().split('T')[0];

    const isPrivileged = activeSessionUser && ['admin', 'manager'].includes(activeSessionUser.role);

    fetch(`api.php?action=fetch_duties_registry&date=${pickedDate}`)
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success') {
                const totalTasks = res.data.filter(d => d.duty_id).length;
                const completedTasks = res.data.filter(d => d.status === 'Complete').length;
                const pendingTasks = totalTasks - completedTasks;
                const progressPct = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

                let dashboardHTML = `
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div class="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-4 rounded-xl shadow-sm flex items-center justify-between">
                            <div><p class="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Total Tasks Today</p><h3 class="text-2xl font-bold text-slate-800 dark:text-white">${totalTasks}</h3></div>
                            <div class="p-3 bg-blue-50 text-blue-500 rounded-lg dark:bg-blue-900/30"><i data-lucide="layers" class="w-6 h-6"></i></div>
                        </div>
                        <div class="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-4 rounded-xl shadow-sm flex items-center justify-between">
                            <div><p class="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Completed Tasks</p><h3 class="text-2xl font-bold text-emerald-600">${completedTasks}</h3></div>
                            <div class="p-3 bg-emerald-50 text-emerald-500 rounded-lg dark:bg-emerald-900/30"><i data-lucide="check-circle" class="w-6 h-6"></i></div>
                        </div>
                        <div class="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-4 rounded-xl shadow-sm flex items-center justify-between">
                            <div><p class="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Pending Tasks</p><h3 class="text-2xl font-bold text-orange-500">${pendingTasks}</h3></div>
                            <div class="p-3 bg-orange-50 text-orange-500 rounded-lg dark:bg-orange-900/30"><i data-lucide="clock" class="w-6 h-6"></i></div>
                        </div>
                        <div class="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-4 rounded-xl shadow-sm flex flex-col justify-center">
                            <div class="flex justify-between text-xs font-mono font-bold text-slate-700 dark:text-gray-300 mb-2"><span>Completion Rate</span><span>${progressPct}%</span></div>
                            <div class="w-full bg-slate-100 dark:bg-gray-800 rounded-full h-2.5"><div class="bg-emerald-500 h-2.5 rounded-full transition-all" style="width: ${progressPct}%"></div></div>
                        </div>
                    </div>
                `;

                if (isPrivileged) {
                    dashboardHTML += `
                        <div class="flex items-center gap-3 mb-6 bg-slate-50 dark:bg-gray-800/50 p-3 border border-slate-200 dark:border-gray-700 rounded-xl">
                            <button onclick="triggerAutoAssignModal('${pickedDate}')" class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-mono font-bold text-xs uppercase transition flex items-center justify-center gap-2 shadow-sm"><i data-lucide="wand-2" class="w-4 h-4"></i> Auto-Assign Tasks</button>
                            <button onclick="resetDailyAssignments('${pickedDate}')" class="flex-1 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-400 py-2.5 rounded-lg font-mono font-bold text-xs uppercase transition flex items-center justify-center gap-2"><i data-lucide="rotate-ccw" class="w-4 h-4"></i> Reset Board</button>
                        </div>
                    `;
                }

                dashboardHTML += `
                    <div class="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                        <table class="w-full text-left text-sm whitespace-nowrap">
                            <thead class="bg-slate-50 dark:bg-gray-900/50 border-b border-slate-200 dark:border-gray-800 font-mono text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                                <tr>
                                    <th class="p-4">Operator Name</th>
                                    <th class="p-4">Assigned Website Workspace</th>
                                    <th class="p-4">Category Book</th>
                                    <th class="p-4">Task Status</th>
                                    <th class="p-4">Time Completed</th>
                                    ${isPrivileged ? '<th class="p-4 text-right">Actions</th>' : ''}
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-gray-850">
                `;

                // ... inside loadDutiesConfigurationRegistry() ...
                if (res.data.length === 0) {
                    dashboardHTML += `<tr><td colspan="6" class="p-6 text-center text-slate-400 font-mono italic">No tracking operations scheduled today.</td></tr>`;
                } else {
                    res.data.forEach(duty => {
                        if (!duty.duty_id) return;
                        const isComplete = duty.status === 'Complete';
                        const isOverwritten = duty.overwritten_by !== null && duty.overwritten_by !== duty.user_id;

                        let statusBadge = '';
                        if (isOverwritten) {
                            statusBadge = `<span class="px-2.5 py-1 bg-purple-50 text-purple-600 border border-purple-200 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max" title="Committed by ${duty.overwriter_name}"><i data-lucide="shield-check" class="w-3 h-3"></i> Mgmt Override</span>`;
                        } else if (isComplete) {
                            statusBadge = '<span class="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max"><i data-lucide="check" class="w-3 h-3"></i> Complete</span>';
                        } else {
                            statusBadge = '<span class="px-2.5 py-1 bg-orange-50 text-orange-600 border border-orange-200 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max"><i data-lucide="clock" class="w-3 h-3"></i> Pending</span>';
                        }

                        const bookBadge = duty.book_category === 'green'
                            ? '<span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 rounded text-[10px] uppercase font-bold">Green Book</span>'
                            : '<span class="px-2.5 py-1 bg-slate-800 text-white border border-slate-700 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 rounded text-[10px] uppercase font-bold">Black Book</span>';

                        const timeCompletedStr = (isComplete && duty.completed_at)
                            ? `<span class="text-[11px] font-mono text-slate-500 dark:text-gray-400 flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i>${new Date(duty.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`
                            : '<span class="text-[11px] font-mono text-slate-300 dark:text-gray-600">-</span>';

                        dashboardHTML += `
            <tr class="hover:bg-slate-50 dark:hover:bg-gray-900/40 transition">
                <td class="p-4 font-bold text-slate-800 dark:text-gray-200">${duty.full_name}</td>
                <td class="p-4 font-mono text-slate-600 dark:text-gray-400">${duty.site_name}</td>
                <td class="p-4">${bookBadge}</td>
                <td class="p-4">
                    <div class="inline-flex items-center gap-2">
                        ${statusBadge}
                    </div>
                </td>
                <td class="p-4">${timeCompletedStr}</td>
                ${isPrivileged ? `<td class="p-4 text-right"><button onclick="removeTaskAssignment(${duty.duty_id})" class="p-2 text-rose-500 hover:bg-rose-50 rounded transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button></td>` : ''}
            </tr>
        `;
                    });
                }

                dashboardHTML += `</tbody></table></div>`;

                let wrapper = document.getElementById("dutiesDashboardWrapper");
                if (!wrapper) {
                    wrapper = document.createElement("div");
                    wrapper.id = "dutiesDashboardWrapper";
                    document.querySelector("#dailyDutiesWorkflowTable").parentElement.replaceWith(wrapper);
                }
                wrapper.innerHTML = dashboardHTML;

                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
}

function toggleTaskStateText(checkbox, dutyId) {
    const newStatus = checkbox.checked ? 'Complete' : 'Pending';
    fetch('api.php?action=update_duty_status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duty_id: dutyId, status: newStatus })
    }).then(() => loadDutiesConfigurationRegistry());
}

function resetDailyAssignments(targetDate) {
    Swal.fire({
        title: 'Clear Tracking Board?',
        text: 'This will erase all pending assignments. Completed matrices for the day will be preserved and locked.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Yes, Clear Board'
    }).then(res => {
        if (res.isConfirmed) {
            fetch('api.php?action=clear_daily_duties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: targetDate })
            }).then(() => {
                Swal.fire('Cleared!', 'The board has been reset.', 'success');
                loadDutiesConfigurationRegistry();
            });
        }
    });
}

async function triggerAutoAssignModal(targetDate) {
    const userRes = await fetch('api.php?action=fetch_users').then(r => r.json());
    const operators = userRes.data.filter(u => u.user_role === 'user');

    if (operators.length === 0) {
        Swal.fire('No Operators Found', 'You must have standard users in the system to auto-assign tasks.', 'warning');
        return;
    }

    const existingDutiesRes = await fetch(`api.php?action=fetch_duties_registry&date=${targetDate}`).then(r => r.json());
    const completedTasksMap = new Set();

    if (existingDutiesRes.status === 'success') {
        existingDutiesRes.data.forEach(d => {
            if (d.status === 'Complete') {
                completedTasksMap.add(`${d.domain_id}_${d.book_category}`);
            }
        });
    }

    let checklistHTML = `
        <div class="text-left font-mono mb-4 text-slate-500 text-xs">
            <p class="mb-2 text-slate-600 dark:text-gray-300">Smart Distribution: Completed matrices for ${targetDate} will be locked and excluded from reassignment.</p>
            <p class="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2">
                <i data-lucide="user-minus" class="w-4 h-4"></i> Check any operator who is ABSENT today.
            </p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-3 bg-slate-50 dark:bg-gray-900/50 border border-slate-200 dark:border-gray-800 rounded-xl">
    `;
    operators.forEach(op => {
        checklistHTML += `
            <label class="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-rose-50 hover:border-rose-200 dark:hover:bg-rose-950/40 dark:hover:border-rose-800 transition-all shadow-sm">
                <div class="relative flex items-center">
                    <input type="checkbox" value="${op.id}" class="absent-operator-cb peer w-5 h-5 text-rose-500 bg-slate-100 border-slate-300 rounded focus:ring-rose-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer transition">
                </div>
                <div class="flex flex-col text-left">
                    <span class="text-slate-800 dark:text-gray-200 font-bold text-sm tracking-tight truncate">${op.full_name}</span>
                    <span class="text-slate-400 dark:text-gray-500 text-[10px] uppercase font-mono tracking-wider">${op.username}</span>
                </div>
            </label>
        `;
    });
    checklistHTML += `</div>`;

    const { isConfirmed } = await Swal.fire({
        title: 'Configure Auto-Assignment',
        html: checklistHTML,
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#64748b',
        confirmButtonText: '<i data-lucide="zap" class="w-4 h-4 inline-block mr-1"></i> Distribute Tasks',
        cancelButtonText: 'Cancel',
        customClass: {
            popup: 'dark:bg-gray-900 dark:border dark:border-gray-800 rounded-2xl',
            title: 'dark:text-white font-black text-xl font-mono',
            actions: 'gap-3'
        },
        didOpen: () => {
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    });

    if (isConfirmed) {
        const absentCheckboxes = document.querySelectorAll('.absent-operator-cb:checked');
        const absentIds = Array.from(absentCheckboxes).map(cb => parseInt(cb.value));
        const presentOperators = operators.filter(op => !absentIds.includes(parseInt(op.id)));

        if (presentOperators.length === 0) {
            Swal.fire('Cannot Proceed', 'All operators are marked absent!', 'error');
            return;
        }

        Swal.fire({ title: 'Distributing Tasks...', text: 'Please wait while tasks are allocated.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const allTasks = [];
        corporateDomainsList.forEach(domain => {
            ['green', 'black'].forEach(book => {
                if (!completedTasksMap.has(`${domain.id}_${book}`)) {
                    allTasks.push({ domain_id: domain.id, book: book });
                }
            });
        });

        if (allTasks.length === 0) {
            Swal.fire('All Tasks Complete', 'All property book matrices for today have already been completed and committed.', 'info');
            loadDutiesConfigurationRegistry();
            return;
        }

        // Shuffle tasks randomly
        for (let i = allTasks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allTasks[i], allTasks[j]] = [allTasks[j], allTasks[i]];
        }

        // Shuffle operators randomly
        for (let i = presentOperators.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [presentOperators[i], presentOperators[j]] = [presentOperators[j], presentOperators[i]];
        }

        let operatorIndex = 0;
        for (let task of allTasks) {
            const assignee = presentOperators[operatorIndex % presentOperators.length];
            const formData = new FormData();
            formData.append('user_id', assignee.id);
            formData.append('domain_id', task.domain_id);
            formData.append('book_category', task.book);
            formData.append('date', targetDate);

            await fetch('assign_task.php', { method: 'POST', body: formData });
            operatorIndex++;
        }

        Swal.fire('Distribution Complete', `Allocated ${allTasks.length} pending tracking configurations randomly across ${presentOperators.length} operators. Completed records were locked.`, 'success');
        loadDutiesConfigurationRegistry();
    }
}

function executeTaskAssignmentBroadcast(workerId, targetDate) {
    const domainId = document.getElementById(`new_domain_${workerId}`).value;
    const bookCategory = document.getElementById(`new_book_${workerId}`).value;

    if (!domainId) {
        Swal.fire('Incomplete Assignment', 'Please select a property domain to assign.', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('user_id', workerId);
    formData.append('domain_id', domainId);
    formData.append('book_category', bookCategory);
    formData.append('date', targetDate);

    fetch('assign_task.php', {
        method: 'POST',
        body: formData
    })
        .then(res => res.text())
        .then(text => {
            if (text.trim() === "SUCCESS") {
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                Toast.fire({ icon: 'success', title: 'Task assignment added.' });
                loadDutiesConfigurationRegistry();
            } else {
                Swal.fire('Assignment Error', text, 'error');
            }
        })
        .catch(err => {
            console.error("Fetch Error:", err);
            Swal.fire('Network Error', 'Failed to communicate with the server.', 'error');
        });
}

function triggerUserCreationModal() {
    triggerUserModificationPopup({ id: 0, username: '', full_name: '', user_role: 'user' });
}

function triggerUserEditPipeline(userObj) {
    triggerUserModificationPopup(userObj);
}

function triggerUserModificationPopup(user) {
    let roleOptions = '';

    if (activeSessionUser.role === 'manager') {
        roleOptions = `<option value="user" selected>Standard Operator (Worker User)</option>`;
    } else if (activeSessionUser.role === 'it_staff') {
        roleOptions = `
            <option value="user" ${user.user_role === 'user' ? 'selected' : ''}>Standard Operator (Worker User)</option>
            <option value="it_staff" ${user.user_role === 'it_staff' ? 'selected' : ''}>IT Architecture Support (IT Role)</option>
        `;
    } else {
        roleOptions = `
            <option value="user" ${user.user_role === 'user' ? 'selected' : ''}>Standard Operator (Worker User)</option>
            <option value="manager" ${user.user_role === 'manager' ? 'selected' : ''}>Corporate Manager (Person)</option>
            <option value="it_staff" ${user.user_role === 'it_staff' ? 'selected' : ''}>IT Architecture Support (IT Role)</option>
            <option value="admin" ${user.user_role === 'admin' ? 'selected' : ''}>Master Administrator (Full Scope)</option>
        `;
    }

    Swal.fire({
        title: user.id === 0 ? 'Register Account Profile' : 'Modify Account Profile',
        html: `
            <div class="text-left space-y-3 font-mono text-xs">
                <label class="block">Full User Display Name</label>
                <input id="swalFullName" class="w-full p-2.5 bg-slate-50 border rounded dark:bg-gray-900 text-sm text-slate-900 dark:text-white" value="${user.full_name}">
                <label class="block">Account Username Identity</label>
                <input id="swalUsername" class="w-full p-2.5 bg-slate-50 border rounded dark:bg-gray-900 text-sm text-slate-900 dark:text-white" value="${user.username}" ${user.id !== 0 ? 'readonly' : ''}>
                <label class="block">Security Cipher Password ${user.id !== 0 ? '(Leave blank to retain current)' : ''}</label>
                <input id="swalPassword" type="password" class="w-full p-2.5 bg-slate-50 border rounded dark:bg-gray-900 text-sm text-slate-900 dark:text-white">
                <label class="block">Authority Level Scope</label>
                <select id="swalRole" class="w-full p-2.5 bg-slate-50 border rounded dark:bg-gray-900 text-sm text-slate-900 dark:text-white">
                    ${roleOptions}
                </select>
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'Commit Profile Settings',
        preConfirm: () => {
            return {
                id: user.id,
                full_name: document.getElementById("swalFullName").value.trim(),
                username: document.getElementById("swalUsername").value.trim(),
                password: document.getElementById("swalPassword").value,
                role: document.getElementById("swalRole").value
            }
        }
    }).then(res => {
        if (res.isConfirmed && res.value) {
            fetch('api.php?action=save_user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(res.value)
            }).then(r => r.json()).then(data => {
                if (data.status === 'success') {
                    loadCorporateUsersRegistry();
                    Swal.fire('Committed', 'User profile records synchronized.', 'success');
                } else {
                    Swal.fire('Error', data.message, 'error');
                }
            });
        }
    });
}

function executeUserDeletionSequence(uId) {
    Swal.fire({
        title: 'Purge Identity Account Record?',
        text: "This action immediately deletes the target profile identity from all core registries.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444'
    }).then(res => {
        if (res.isConfirmed) {
            fetch('api.php?action=delete_user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: uId })
            }).then(r => r.json()).then(data => {
                if (data.status === 'success') {
                    loadCorporateUsersRegistry();
                    Swal.fire('Purged', 'Profile completely dropped.', 'success');
                } else {
                    Swal.fire('Transaction Cancelled', data.message, 'error');
                }
            });
        }
    });
}

// ==========================================================================
// INQUIRIES DESK LOGIC & REAL-TIME FILTERING
// ==========================================================================

let allInquiriesData = [];
let inqDateFilter = "7";
let inqCustomStartVal = null;
let inqCustomEndVal = null;
let inqDomainFilterVal = "all";

function loadInquiriesPerformanceBoard() {
    const tbody = document.querySelector("#inquiriesRegistryTable tbody");
    const adminAssignBtn = document.getElementById("adminManageInqAssignBtn");
    if (!tbody) return;

    // Assignment Manager limits
    if (activeSessionUser && activeSessionUser.role === 'admin') {
        adminAssignBtn.classList.remove("hidden");
    } else {
        adminAssignBtn.classList.add("hidden");
    }

    // 1. Fetch authorized domains for the filter dropdown
    fetch('api.php?action=fetch_assigned_inquiry_domains')
        .then(r => r.json())
        .then(res => {
            const domSelect = document.getElementById("inqDomainSelect");
            if (res.status === 'success' && domSelect) {
                domSelect.innerHTML = '<option value="all" selected>Search All Parameters</option>' +
                    res.data.map(d => `<option value="${d.id}">${d.site_name}</option>`).join('');
                domSelect.value = inqDomainFilterVal;
            }
        });

    // 2. Fetch all authorized inquiries
    fetch('api.php?action=fetch_inquiries')
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success') {
                allInquiriesData = res.data;
                renderInquiriesTableAndStats(); // Pass to the reactive rendering engine
            }
        });
}

function renderInquiriesTableAndStats() {
    const tbody = document.querySelector("#inquiriesRegistryTable tbody");
    if (!tbody) return;

    // Apply Filter Logic Sequence
    let filteredData = allInquiriesData;

    // A. Apply Target Domain Filter
    if (inqDomainFilterVal !== "all") {
        filteredData = filteredData.filter(item => item.domain_id == inqDomainFilterVal);
    }

    // B. Apply Timeline Period Filter
    if (inqDateFilter !== "all") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (inqDateFilter === "custom" && inqCustomStartVal && inqCustomEndVal) {
            const start = new Date(inqCustomStartVal);
            const end = new Date(inqCustomEndVal);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            filteredData = filteredData.filter(item => {
                const inqDate = new Date(item.inquiry_date);
                return inqDate >= start && inqDate <= end;
            });
        } else if (inqDateFilter !== "custom") {
            const days = parseInt(inqDateFilter);
            filteredData = filteredData.filter(item => {
                const inqDate = new Date(item.inquiry_date);
                inqDate.setHours(0, 0, 0, 0);
                const diffTime = Math.abs(today - inqDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= days;
            });
        }
    }

    // Calculate Real-Time Stats
    let eCount = 0, wCount = 0;
    filteredData.forEach(inq => {
        if (inq.inquiry_source === 'Email') eCount++;
        else wCount++;
    });

    // Push calculations to UI Tiles
    document.getElementById("inqTotalStat").innerText = filteredData.length;
    document.getElementById("inqEmailStat").innerText = eCount;
    document.getElementById("inqWhatsappStat").innerText = wCount;

    // Render Cleaned Data Table Rows
    tbody.innerHTML = "";

    if (filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400 font-mono italic">No tracking operations recorded in this specific parameter range.</td></tr>`;
    } else {
        filteredData.forEach(inq => {
            const sourceBadge = inq.inquiry_source === 'WhatsApp'
                ? `<span class="text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded text-[10px]"><i data-lucide="message-circle" class="w-3 h-3 inline-block -mt-0.5"></i> WhatsApp</span>`
                : `<span class="text-blue-500 font-bold bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded text-[10px]"><i data-lucide="mail" class="w-3 h-3 inline-block -mt-0.5"></i> Email</span>`;

            // Enforce RBAC
            let actionsHtml = '';
            if (activeSessionUser.role === 'admin') {
                actionsHtml = `<button onclick='triggerAddInquiryModal(${JSON.stringify(inq).replace(/"/g, '&quot;')})' class="p-1 text-blue-500 hover:underline mx-1">Edit</button>
                               <button onclick="executeInquiryDeletion(${inq.id})" class="p-1 text-red-500 hover:underline mx-1">Delete</button>`;
            } else if (activeSessionUser.role === 'manager') {
                actionsHtml = `<button onclick='triggerAddInquiryModal(${JSON.stringify(inq).replace(/"/g, '&quot;')})' class="p-1 text-blue-500 hover:underline mx-1">Edit</button>`;
            } else {
                actionsHtml = `<span class="text-[10px] text-slate-400 italic">Locked</span>`;
            }

            const tr = document.createElement("tr");
            tr.className = "hover:bg-slate-50 dark:hover:bg-gray-900/30 border-b border-slate-100 dark:border-gray-850 transition";
            tr.innerHTML = `
                <td class="p-3 font-bold">${inq.inquiry_date}</td>
                <td class="p-3 text-indigo-500 font-bold">${inq.site_name}</td>
                <td class="p-3 text-slate-800 dark:text-gray-200 font-bold">${inq.client_name}</td>
                <td class="p-3">${inq.safari_type}</td>
                <td class="p-3 font-mono text-[10px] text-slate-500">${inq.phone_number || 'N/A'}</td>
                <td class="p-3 flex flex-col items-start gap-1">
                    ${sourceBadge}
                    <span class="text-[9px] text-slate-400">By: ${inq.logged_by}</span>
                </td>
                <td class="p-3 text-right">${actionsHtml}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ---------------------------------------------------------
// Filter Engine Control Mutators
// ---------------------------------------------------------
function changeInqDateFilter(val) {
    inqDateFilter = val;
    const customUI = document.getElementById("inqCustomDateRangeUI");
    if (val === 'custom') {
        customUI.classList.remove("hidden");
        customUI.classList.add("flex");
    } else {
        customUI.classList.add("hidden");
        customUI.classList.remove("flex");
        renderInquiriesTableAndStats();
    }
}

function applyInqCustomDateFilter() {
    inqCustomStartVal = document.getElementById("inqCustomStart").value;
    inqCustomEndVal = document.getElementById("inqCustomEnd").value;
    if (inqCustomStartVal && inqCustomEndVal) {
        renderInquiriesTableAndStats();
    } else {
        Swal.fire({ title: 'Invalid Range', text: 'Please define exact chronological boundaries.', icon: 'warning' });
    }
}

function changeInqDomainFilter(val) {
    inqDomainFilterVal = val;
    renderInquiriesTableAndStats();
}

// ---------------------------------------------------------
// Modal Interfaces & Processing Pipelines
// ---------------------------------------------------------
function triggerAddInquiryModal(existingData = null) {
    fetch('api.php?action=fetch_assigned_inquiry_domains')
        .then(res => res.json())
        .then(res => {
            if (res.status !== 'success' || res.data.length === 0) {
                Swal.fire('No Properties Assigned', 'You have not been assigned any websites to manage inquiries for.', 'warning');
                return;
            }

            const isEdit = existingData !== null;
            const domainOptions = res.data.map(d => `<option value="${d.id}" ${(isEdit && existingData.domain_id == d.id) ? 'selected' : ''}>${d.site_name} (${d.site_url})</option>`).join('');

            const todayStr = new Date().toISOString().split('T')[0];
            const dataObj = isEdit ? existingData : { client_name: '', safari_type: '', phone_number: '', inquiry_date: todayStr, inquiry_source: 'Email' };

            Swal.fire({
                title: isEdit ? 'Edit Client Inquiry' : 'Log New Safari Inquiry',
                html: `
                    <div class="text-left space-y-3 font-mono text-xs">
                        <label class="block font-bold">Target Website Origin</label>
                        <select id="inqDomainId" class="w-full p-2.5 bg-slate-50 border rounded dark:bg-gray-900 focus:outline-none focus:border-indigo-500">${domainOptions}</select>
                        
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-bold">Date Sent</label>
                                <input id="inqDate" type="date" class="w-full p-2.5 bg-slate-50 border rounded dark:bg-gray-900 focus:outline-none focus:border-indigo-500" value="${dataObj.inquiry_date}">
                            </div>
                            <div>
                                <label class="block font-bold">Inquiry Source</label>
                                <select id="inqSource" class="w-full p-2.5 bg-slate-50 border rounded dark:bg-gray-900 focus:outline-none focus:border-indigo-500">
                                    <option value="Email" ${dataObj.inquiry_source === 'Email' ? 'selected' : ''}>Email Server</option>
                                    <option value="WhatsApp" ${dataObj.inquiry_source === 'WhatsApp' ? 'selected' : ''}>WhatsApp API</option>
                                </select>
                            </div>
                        </div>

                        <label class="block font-bold">Client Full Name</label>
                        <input id="inqClientName" class="w-full p-2.5 bg-slate-50 border rounded dark:bg-gray-900 focus:outline-none focus:border-indigo-500" placeholder="e.g. John Doe" value="${dataObj.client_name}">
                        
                        <label class="block font-bold">Requested Safari Type</label>
                        <input id="inqSafari" class="w-full p-2.5 bg-slate-50 border rounded dark:bg-gray-900 focus:outline-none focus:border-indigo-500" placeholder="e.g. 3 Days Masai Mara" value="${dataObj.safari_type}">
                        
                        <label class="block font-bold">Phone Number (Optional)</label>
                        <input id="inqPhone" class="w-full p-2.5 bg-slate-50 border rounded dark:bg-gray-900 focus:outline-none focus:border-indigo-500" placeholder="+1 234 567 890" value="${dataObj.phone_number || ''}">
                    </div>
                `,
                showCancelButton: true,
                confirmButtonColor: '#4f46e5',
                confirmButtonText: isEdit ? 'Commit Changes' : 'Record Inquiry',
                preConfirm: () => {
                    const clientName = document.getElementById("inqClientName").value.trim();
                    const safariType = document.getElementById("inqSafari").value.trim();
                    if (!clientName || !safariType) {
                        Swal.showValidationMessage("Client Name and Safari Type are required.");
                        return false;
                    }
                    return {
                        id: isEdit ? existingData.id : 0,
                        domain_id: document.getElementById("inqDomainId").value,
                        inquiry_date: document.getElementById("inqDate").value,
                        inquiry_source: document.getElementById("inqSource").value,
                        client_name: clientName,
                        safari_type: safariType,
                        phone_number: document.getElementById("inqPhone").value.trim()
                    }
                }
            }).then(res => {
                if (res.isConfirmed && res.value) {
                    fetch('api.php?action=save_inquiry', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(res.value)
                    }).then(r => r.json()).then(data => {
                        if (data.status === 'success') {
                            loadInquiriesPerformanceBoard();
                            SystemToast.fire({ icon: 'success', title: 'Inquiry Matrix Updated!' });
                        } else {
                            Swal.fire('Error', data.message, 'error');
                        }
                    });
                }
            });
        });
}

function executeInquiryDeletion(id) {
    Swal.fire({
        title: 'Delete this Inquiry?',
        text: "This data point will be removed from conversion tracking metrics.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444'
    }).then(res => {
        if (res.isConfirmed) {
            fetch('api.php?action=delete_inquiry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id })
            }).then(r => r.json()).then(data => {
                if (data.status === 'success') loadInquiriesPerformanceBoard();
            });
        }
    });
}

function triggerAdminInquiryAssignments() {
    fetch('api.php?action=fetch_admin_inquiry_assignments')
        .then(r => r.json())
        .then(res => {
            if (res.status !== 'success') return;

            let htmlList = `<div class="max-h-[400px] overflow-y-auto space-y-4 text-left font-mono text-xs">`;

            res.data.forEach(staff => {
                let tags = staff.assigned_domains.map(d => `
                    <span class="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 px-2 py-1 rounded mt-1">
                        ${d.site_url} 
                        <button onclick="removeAdminInquiryAssign(${staff.id}, ${d.id})" class="text-rose-500 hover:text-rose-700 ml-1"><i data-lucide="x" class="w-3 h-3"></i></button>
                    </span>
                `).join('');

                if (tags === '') tags = `<span class="text-slate-400 italic mt-1 block">No properties currently assigned.</span>`;

                let options = corporateDomainsList.map(d => `<option value="${d.id}">${d.site_url}</option>`).join('');

                htmlList += `
                    <div class="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl p-4">
                        <div class="font-bold text-slate-800 dark:text-white uppercase mb-2 text-sm">${staff.full_name}</div>
                        <div class="flex flex-wrap gap-1 mb-3">${tags}</div>
                        <div class="flex gap-2">
                            <select id="assign_dom_${staff.id}" class="flex-1 p-2 bg-white dark:bg-gray-950 border rounded outline-none">${options}</select>
                            <button onclick="addAdminInquiryAssign(${staff.id})" class="bg-slate-800 hover:bg-slate-700 text-white dark:bg-gray-800 dark:hover:bg-gray-700 px-3 rounded font-bold transition">Assign</button>
                        </div>
                    </div>
                `;
            });
            htmlList += `</div>`;

            Swal.fire({
                title: 'Manage Staff Inquiry Assignments',
                html: htmlList,
                width: 700,
                showConfirmButton: true,
                confirmButtonColor: '#4f46e5',
                confirmButtonText: 'Done',
                didOpen: () => { if (typeof lucide !== 'undefined') lucide.createIcons(); }
            });
        });
}

window.addAdminInquiryAssign = function (userId) {
    const domId = document.getElementById(`assign_dom_${userId}`).value;
    fetch('api.php?action=save_inquiry_assignment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, domain_id: domId })
    }).then(() => { triggerAdminInquiryAssignments(); });
}

window.removeAdminInquiryAssign = function (userId, domId) {
    fetch('api.php?action=remove_inquiry_assignment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, domain_id: domId })
    }).then(() => { triggerAdminInquiryAssignments(); });
}

// ==========================================================================
// REAL-TIME SYSTEM CLOCK
// ==========================================================================
function startLiveSystemClock() {
    const clockElement = document.getElementById("headerCurrentDateText");
    if (!clockElement) return;

    setInterval(() => {
        const now = new Date();
        const formattedTime = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + ' ' +
            String(now.getHours()).padStart(2, '0') + ':' +
            String(now.getMinutes()).padStart(2, '0') + ':' +
            String(now.getSeconds()).padStart(2, '0');

        clockElement.innerText = formattedTime;
    }, 1000);
}