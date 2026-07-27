// ==========================================================================
// router.js - Sidebar View Routing Logic & User Interface Theme Drivers (v5)
// ==========================================================================

// 1. Core View Router Module with Safe Dynamic Header Fallbacks & Custom Fonts
function switchViewMode(targetMode, propertyId = null) {
    activeViewMode = targetMode;
    
    const dashboardViewNode = document.getElementById("enterpriseDashboardSection");
    const workspaceViewNode = document.getElementById("individualPropertyWorkspaceSection");
    const configSectionNode = document.getElementById("systemConfigurationSection");
    
    const viewTitleNode = document.getElementById("viewTitleHeader");
    const viewSubtitleNode = document.getElementById("viewSubtitleHeader");
    const headerIconNode = document.getElementById("globalHeaderIcon");
    const iconContainerNode = document.getElementById("headerTitleIconContainer");

    // CRITICAL RESET FIX: Clear out lingering visualization chart instances to prevent crossing domains info
    if (lineChartInstance) { lineChartInstance.destroy(); lineChartInstance = null; }
    if (barChartInstance) { barChartInstance.destroy(); barChartInstance = null; }

    document.querySelectorAll("aside nav button").forEach(btn => {
        btn.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-mono text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-900 transition-all";
    });

    if (targetMode === 'dashboard') {
        if (dashboardViewNode) dashboardViewNode.classList.remove("hidden");
        if (workspaceViewNode) workspaceViewNode.classList.add("hidden");
        if (configSectionNode) configSectionNode.classList.add("hidden");
        
        const dashNav = document.getElementById("nav-dashboard");
        if (dashNav) {
            dashNav.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-mono transition-all bg-emerald-600 text-white dark:text-gray-950 font-bold shadow-md";
        }
        
        if (viewTitleNode) {
            viewTitleNode.innerText = "GLOBAL ENTERPRISE DASHBOARD";
            viewTitleNode.className = "text-sm font-black font-mono tracking-widest text-slate-800 dark:text-white uppercase";
        }
        if (viewSubtitleNode) {
            viewSubtitleNode.innerText = "Aggregated Cross-Domain Search Analysis Core View";
        }
        if (headerIconNode) { headerIconNode.setAttribute("data-lucide", "layout-dashboard"); }
        if (iconContainerNode) {
            iconContainerNode.className = "p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600 dark:text-emerald-400";
        }
        
        if (typeof loadEnterpriseDomains === "function") {
            loadEnterpriseDomains();
        }

    } else if (targetMode === 'property' && propertyId) {
        if (workspaceViewNode) workspaceViewNode.classList.remove("hidden");
        if (dashboardViewNode) dashboardViewNode.classList.add("hidden");
        if (configSectionNode) configSectionNode.classList.add("hidden");
        
        activeDomainId = propertyId;
        
        const propNav = document.getElementById(`nav-prop-${propertyId}`);
        if (propNav) {
            propNav.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-mono transition-all bg-emerald-600 text-white dark:text-gray-950 font-bold shadow-md";
        }
        
        const fallbackUrls = {
            1: { name: "KAIRI TRAVELS MAIN", url: "kairitravels.com" },
            2: { name: "KAIRI TOURS CORE", url: "kairitours.com" },
            3: { name: "RHINO TOURIST CAMP", url: "rhinotouristcamp.com" },
            4: { name: "RHINO LUXURY CAMP", url: "rhinoluxurycamp.com" },
            5: { name: "KAIRI TRAVELS KE", url: "kairi.co.ke" }
        };

        const domainObj = corporateDomainsList.find(d => d.id === propertyId) || fallbackUrls[propertyId];
        
        if (domainObj) {
            if (viewTitleNode) {
                viewTitleNode.innerText = (domainObj.site_name || domainObj.name).toUpperCase();
                viewTitleNode.className = "text-sm font-black font-mono tracking-widest text-slate-800 dark:text-white uppercase";
            }
            if (viewSubtitleNode) {
                viewSubtitleNode.innerText = `Workspace Environment Engine Context: ${domainObj.site_url || domainObj.url}`;
            }
            if (headerIconNode) { headerIconNode.setAttribute("data-lucide", "globe"); }
            if (iconContainerNode) {
                iconContainerNode.className = "p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600 dark:text-blue-400";
            }
        }
        
        // Setup initial default segment visualization mode
        window.activeChartBookSegment = "section1";
        
        // Reset sheet table views before loading fresh records
        const t1 = document.getElementById('sheetTableSection1'); if (t1) t1.querySelector('tbody').innerHTML = "";
        const t2 = document.getElementById('sheetTableSection2'); if (t2) t2.querySelector('tbody').innerHTML = "";

        if (typeof loadDatabaseRecords === "function") {
            loadDatabaseRecords();
        } else if (typeof renderInputFieldsMatrix === "function") {
            renderInputFieldsMatrix();
        }
		
    } else if (targetMode === 'config') {
        if (dashboardViewNode) dashboardViewNode.classList.add("hidden");
        if (workspaceViewNode) workspaceViewNode.classList.add("hidden");
        if (configSectionNode) configSectionNode.classList.remove("hidden");

        const configNav = document.getElementById("nav-config");
        if (configNav) {
            configNav.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-mono transition-all bg-emerald-600 text-white dark:text-gray-950 font-bold shadow-md";
        }

        if (viewTitleNode) {
            viewTitleNode.innerText = "KEYWORD ENGINE MASTER MANAGER";
            viewTitleNode.className = "text-sm font-black font-mono tracking-widest text-slate-800 dark:text-white uppercase";
        }
        if (viewSubtitleNode) {
            viewSubtitleNode.innerText = "Non-Technical Optimization Strategy Control Board Panel Hub";
        }
        if (headerIconNode) { headerIconNode.setAttribute("data-lucide", "settings-2"); }
        if (iconContainerNode) {
            iconContainerNode.className = "p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600 dark:text-blue-400";
        }

        if (typeof populateConfigManagerFields === "function") {
            populateConfigManagerFields();
        } else {
            setTimeout(function() {
                if (typeof populateConfigManagerFields === "function") populateConfigManagerFields();
            }, 60);
        }
    }

    if (typeof lucide !== 'undefined') { lucide.createIcons(); }
}

// 2. Application Appearance Theme Coordinator Module
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
    
    if (typeof lucide !== 'undefined') { lucide.createIcons(); }
    if (typeof updateChartsDisplay === "function") { updateChartsDisplay(); }
}

// 3. Isolated Document Event Ingestion Lifecycle Hooks
document.addEventListener("DOMContentLoaded", function() {
    const themeToggleBtn = document.getElementById("themeToggleBtn");
    const selectClusterToggle = document.getElementById("keywordSet");
    const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
    const sidebarDock = document.getElementById("sidebarDock");

    if (localStorage.theme === 'light') {
        applyGlobalAppTheme('light');
    } else {
        applyGlobalAppTheme('dark');
        localStorage.theme = 'dark';
    }

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

    if (selectClusterToggle) {
        selectClusterToggle.addEventListener("change", () => {
            if (typeof renderInputFieldsMatrix === "function") {
                renderInputFieldsMatrix();
            }
        });
    }

    if (sidebarToggleBtn && sidebarDock) {
        sidebarToggleBtn.addEventListener("click", function(event) {
            event.stopPropagation();
            if (sidebarDock.classList.contains("-translate-x-full")) {
                sidebarDock.classList.remove("-translate-x-full");
                sidebarDock.classList.add("translate-x-0");
            } else {
                sidebarDock.classList.remove("translate-x-0");
                sidebarDock.classList.add("-translate-x-full");
            }
        });

        document.addEventListener("click", function(event) {
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
});