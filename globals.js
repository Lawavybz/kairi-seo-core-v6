// ==========================================================================
// globals.js - Core State Registry & Enterprise Master Blueprint Configurations
// ==========================================================================

/**
 * 1. Dynamic Tenant-Isolated Runtime Keywords Cache Registry
 * Replaces the rigid static shared dictionary blueprint with per-domain memory buckets
 */
let keywordsDB = {
    section1: [],
    section2: [] 
};

/**
 * 2. Global Memory Cache for Active Runtime Data Pipelines
 * Maintains domain context and view modes across the application
 */
let appStateStore = { section1: {}, section2: {} };
let corporateDomainsList = [];
let activeDomainId = 1;           
let activeViewMode = 'dashboard'; 

/**
 * 3. Global DOM UI Node Element Registry Cache Lookups
 * Caches frequently accessed DOM elements for rapid rendering performance
 */
const selectClusterToggle = document.getElementById("keywordSet");
const entryForm = document.getElementById("seoLoggerForm");
const targetDateInput = document.getElementById("logDate");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeIcon = document.getElementById("themeIcon");
const themeText = document.getElementById("themeText");

// Set default calendar input date view to today local time
if (targetDateInput) {
    targetDateInput.value = new Date().toISOString().split('T')[0];
}

/**
 * 4. Helper Utility: Global Mathematical Penalty Vector Calculations
 * Computes the weighted matrix total for rankings arrays
 */
function computeWeightedMatrixTotal(rankingsArray) {
    if (!rankingsArray || rankingsArray.length === 0) return 100;
    return rankingsArray.reduce((acc, currentVal) => acc + (currentVal === 0 ? 10 : currentVal), 0);
}

/**
 * 5. Dynamic Remote Handshake Module
 * Queries and updates the local state cache memory configurations with the exact tracking 
 * phrases configured inside the active domain's custom decoupled database records.
 */
function syncActiveTenantKeywords(domainId, callback = null) {
    fetch(`api.php?action=fetch_tenant_keywords_metadata&domain_id=${domainId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP degradation encountered: ${response.status}`);
            }
            return response.text(); 
        })
        .then(rawText => {
            if (!rawText || rawText.trim() === "") {
                keywordsDB.section1 = [];
                keywordsDB.section2 = [];
                if (typeof callback === "function") callback();
                return;
            }

            const res = JSON.parse(rawText);
            
            if (res.status === 'success' && res.data) {
                keywordsDB.section1 = res.data.section1 || [];
                keywordsDB.section2 = res.data.section2 || [];
            } else {
                keywordsDB.section1 = [];
                keywordsDB.section2 = [];
            }
            
            if (typeof callback === "function") callback();
        })
        .catch(err => {
            // Fallbacks prevent screen layout crashes if the network fails
            keywordsDB.section1 = [];
            keywordsDB.section2 = [];
            if (typeof callback === "function") callback();
        });
}

/**
 * 6. System Boot Coordination Hook with Master Pre-Fetch Handshake
 * Initializes core UI components upon DOM load completion
 */
window.addEventListener("DOMContentLoaded", () => {
    // Fire initial Lucide icon vector renderings across sidebar and cards
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Domain fetching and routing is securely handled by auth_app.js
});