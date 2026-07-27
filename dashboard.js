// ==========================================================================
// dashboard.js - Enterprise Global Analytics Summary Table & Charts Router (v5)
// ==========================================================================

// 1. Core Discovery Pipeline: Fetch All Registered Tracking Domains
function loadEnterpriseDomains() {
    fetch('api.php?action=fetch_domains')
        .then(response => response.json())
        .then(res => {
            if (res.status === 'success') {
                corporateDomainsList = res.data;
                calculateAndRenderGlobalMetrics();
            } else {
                console.error("Master Domain Registry Fetch Error:", res.message);
            }
        })
        .catch(err => console.error("API Connection Interruption:", err));
}

// 2. Aggregate Calculator Engine & Overview Standings Renderer
async function calculateAndRenderGlobalMetrics() {
    const tableBody = document.querySelector("#enterpriseOverviewTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    // Array collectors used to calculate data-points for global visualization layers
    let globalPage1Count = 0;
    let globalPages2to10Count = 0;
    let globalUnrankedCount = 0;

    // Temporary stores to map performance dates chronologically
    let dateScoreTracker = {};

    // Loop through each property concurrently to gather real-time data metrics
    const performanceCalculationsPromises = corporateDomainsList.map(async (domain) => {
        try {
            const response = await fetch(`api.php?action=fetch_records&domain_id=${domain.id}`);
            const res = await response.json();
            
            let s1Avg = "N/A";
            let s2Avg = "N/A";
            let cumulativeHealthScore = 100;

            if (res.status === 'success' && res.data) {
                const s1Logs = res.data.section1 || {}; // Green Book Context Logs
                const s2Logs = res.data.section2 || {}; // Black Book Context Logs

                // Process Rank Distribution Categories for the charts
                const categorizeRankDistribution = (sectionLogs) => {
                    Object.keys(sectionLogs).forEach(date => {
                        const scoreRow = sectionLogs[date] || [];
                        scoreRow.forEach(rank => {
                            if (rank === 1) globalPage1Count++;
                            else if (rank > 1 && rank <= 10) globalPages2to10Count++;
                            else if (rank === 0) globalUnrankedCount++;
                        });

                        // Accumulate date records for trendline analysis
                        if (!dateScoreTracker[date]) dateScoreTracker[date] = { sum: 0, count: 0 };
                        dateScoreTracker[date].sum += computeWeightedMatrixTotal(scoreRow);
                        dateScoreTracker[date].count++;
                    });
                };

                categorizeRankDistribution(s1Logs);
                categorizeRankDistribution(s2Logs);

                // Calculate rolling average for Green Book (Section 1) - Last 30 records max if total > 30
                const s1Dates = Object.keys(s1Logs).sort((a, b) => new Date(a) - new Date(b));
                if (s1Dates.length > 0) {
                    const targetS1Dates = s1Dates.length > 30 ? s1Dates.slice(-30) : s1Dates;
                    let s1TotalSum = 0;
                    targetS1Dates.forEach(date => {
                        s1TotalSum += computeWeightedMatrixTotal(s1Logs[date]);
                    });
                    s1Avg = Math.round(s1TotalSum / targetS1Dates.length);
                }

                // Calculate rolling average for Black Book (Section 2) - Last 30 records max if total > 30
                const s2Dates = Object.keys(s2Logs).sort((a, b) => new Date(a) - new Date(b));
                if (s2Dates.length > 0) {
                    const targetS2Dates = s2Dates.length > 30 ? s2Dates.slice(-30) : s2Dates;
                    let s2TotalSum = 0;
                    targetS2Dates.forEach(date => {
                        s2TotalSum += computeWeightedMatrixTotal(s2Logs[date]);
                    });
                    s2Avg = Math.round(s2TotalSum / targetS2Dates.length);
                }

                const numS1 = typeof s1Avg === 'number' ? s1Avg : 50;
                const numS2 = typeof s2Avg === 'number' ? s2Avg : 50;
                cumulativeHealthScore = (numS1 + numS2) / 2;
            }

            return {
                ...domain,
                s1Avg: s1Avg,
                s2Avg: s2Avg,
                health: cumulativeHealthScore
            };
        } catch (err) {
            console.error(`Failed loading metrics map for Domain ID ${domain.id}:`, err);
            return { ...domain, s1Avg: "Err", s2Avg: "Err", health: 100 };
        }
    });

    const computedStandingsList = await Promise.all(performanceCalculationsPromises);

    // Render global dashboard distribution charts using the collected statistics
    if (typeof updateGlobalDashboardCharts === "function") {
        updateGlobalDashboardCharts(dateScoreTracker, globalPage1Count, globalPages2to10Count, globalUnrankedCount);
    }

    // Sort to keep track of optimization priority channels
    computedStandingsList.sort((a, b) => a.health - b.health);

    computedStandingsList.forEach(row => {
        const tableRow = document.createElement("tr");
        tableRow.className = "hover:bg-slate-50 dark:hover:bg-gray-900/30 transition border-b border-slate-200 dark:border-gray-850 text-xs text-slate-700 dark:text-gray-300";

        // Setup layout classifications mapping provided interface design parameters
        let healthBadgeClass = "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50";
        let healthLabel = "OPTIMUM";

        if (row.health > 45 && row.health <= 70) {
            healthBadgeClass = "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-900/50";
            healthLabel = "MID-TIER";
        } else if (row.health > 70 || row.health === 100) {
            healthBadgeClass = "bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/40";
            healthLabel = "AUDIT REQUIRED";
        }

        // Parse strings checking number allocations safely to apply points label rules
        const greenBookDisplay = typeof row.s1Avg === 'number' ? `<span class="text-slate-900 dark:text-white font-extrabold">${row.s1Avg}</span> <span class="text-slate-400 dark:text-gray-500 text-[10px]">pts</span>` : row.s1Avg;
        const blackBookDisplay = typeof row.s2Avg === 'number' ? `<span class="text-slate-900 dark:text-white font-extrabold">${row.s2Avg}</span> <span class="text-slate-400 dark:text-gray-500 text-[10px]">pts</span>` : row.s2Avg;

        tableRow.innerHTML = `
            <td class="p-4 font-semibold text-slate-700 dark:text-gray-200">${row.site_name}</td>
            <td class="p-4 select-all">
                <a href="https://${row.site_url}" target="_blank" class="text-blue-500 hover:underline inline-flex items-center gap-1 font-mono">
                    ${row.site_url} <span class="text-[10px] text-blue-400/80">↗</span>
                </a>
            </td>
            <td class="p-4 text-center font-mono">${greenBookDisplay}</td>
            <td class="p-4 text-center font-mono">${blackBookDisplay}</td>
            <td class="p-4 text-right">
                <span class="px-2.5 py-1 text-[9px] font-mono font-bold rounded border ${healthBadgeClass} tracking-wider uppercase">
                    ${healthLabel}
                </span>
            </td>
        `;
        tableBody.appendChild(tableRow);
    });
}

// ==========================================================================
// EXTENSION 3: CROSS-DOMAIN OPTIMIZATION STANDINGS EXECUTIVE PDF EXPORT
// ==========================================================================
function exportOptimizationStandingsToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Set Document Metadata Headers
    doc.setFont("courier", "bold");
    doc.setFontSize(16);
    doc.setTextColor(16, 185, 129); 
    doc.text("KAIRI TRAVELS - ENTERPRISE SEO SYSTEM CORE", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("courier", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Generated Context: 2026-06-13 16:30 EAT", 14, 26);
    doc.text("Report Title: Multi-Site Standings Executive Evaluation Ledger", 14, 31);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 36, 196, 36);
    
    let verticalCursorOffset = 46;
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    
    // Print Table Headers matching decoupled context names
    doc.text("Target Domain Property Name", 14, verticalCursorOffset);
    doc.text("Green Avg", 120, verticalCursorOffset);
    doc.text("Black Avg", 145, verticalCursorOffset);
    doc.text("Health Rank Status", 170, verticalCursorOffset);
    
    doc.line(14, verticalCursorOffset + 3, 196, verticalCursorOffset + 3);
    verticalCursorOffset += 10;
    
    const dataRows = document.querySelectorAll("#enterpriseOverviewTable tbody tr");
    
    if (dataRows.length === 0) {
        doc.setFont("courier", "italic");
        doc.text("No data entries found in current table frame.", 14, verticalCursorOffset);
    } else {
        doc.setFont("courier", "normal");
        dataRows.forEach((rowElement) => {
            const columns = rowElement.querySelectorAll("td");
            if (columns.length >= 5) {
                const siteName = columns[0].innerText.trim();
                const greenScore = columns[2].innerText.replace(" pts", "").trim();
                const blackScore = columns[3].innerText.replace(" pts", "").trim();
                const healthFlag = columns[4].innerText.trim().split("\n")[0]; 
                
                doc.text(siteName.substring(0, 42), 14, verticalCursorOffset);
                doc.text(greenScore, 120, verticalCursorOffset);
                doc.text(blackScore, 145, verticalCursorOffset);
                doc.text(healthFlag, 170, verticalCursorOffset);
                
                verticalCursorOffset += 7;
            }
        });
    }
    
    doc.save("Kairi_SEO_MultiSite_ExecutiveReport.pdf");
    
    Swal.fire({
        title: "Executive PDF Compiled!",
        text: "The multi-site strategic ledger overview has been downloaded successfully.",
        icon: "success",
        confirmButtonColor: "#3b82f6"
    });
}