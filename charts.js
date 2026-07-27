// ==========================================================================
// charts.js - Context-Aware Data Visualization Engine (Unified Core v5)
// ==========================================================================

// Global chart instances tracking context states across view switches
let lineChartInstance = null;
let lineYAxisInstance = null; // Sticky tracking axis
let barChartInstance = null;
let globalTrendInstance = null;
let globalDistributionInstance = null;

// Global flag tracking chart context view shifts independently
window.activeChartBookSegment = "section1";

function updateGlobalDashboardCharts(dateScoreTracker, page1, pages2to10, unranked) {
    const isDark = document.documentElement.classList.contains('dark');
    const gridColorValue = isDark ? '#1f2937' : '#e2e8f0';
    const labelColorValue = isDark ? '#9ca3af' : '#64748b';

    const sortedTimelineDates = Object.keys(dateScoreTracker).sort((a, b) => new Date(a) - new Date(b));
    const normalizedAveragesArray = sortedTimelineDates.map(date => {
        const item = dateScoreTracker[date];
        return Math.round(item.sum / item.count);
    });

    const trendCanvas = document.getElementById("globalSeoTrendCanvas");
    if (trendCanvas) {
        if (globalTrendInstance) globalTrendInstance.destroy();
        globalTrendInstance = new Chart(trendCanvas.getContext("2d"), {
            type: 'line',
            data: {
                labels: sortedTimelineDates.map(d => d.slice(5)),
                datasets: [{
                    data: normalizedAveragesArray,
                    borderColor: '#3b82f6', 
                    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.04)' : 'rgba(59, 130, 246, 0.08)',
                    borderWidth: 2,
                    tension: 0.35,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { 
                        min: 0,
                        max: 100,
                        reverse: true,
                        grid: { color: gridColorValue }, 
                        ticks: { color: labelColorValue } 
                    },
                    x: { grid: { display: false }, ticks: { color: labelColorValue } }
                }
            }
        });
    }

    const distributionCanvas = document.getElementById("globalDistributionCanvas");
    if (distributionCanvas) {
        if (globalDistributionInstance) globalDistributionInstance.destroy();
        globalDistributionInstance = new Chart(distributionCanvas.getContext("2d"), {
            type: 'doughnut',
            data: {
                labels: ['Page 1 (Optimum)', 'Pages 2-10 (Mid-Tier)', 'Unranked (0)'],
                datasets: [{
                    data: [page1, pages2to10, unranked],
                    backgroundColor: ['#10b981', '#3b82f6', '#ef4444'],
                    borderWidth: isDark ? 2 : 0,
                    borderColor: isDark ? '#030712' : '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: { color: labelColorValue, font: { family: 'monospace', size: 11 } }
                    }
                }
            }
        });
    }
}

function setChartBookSegmentView(targetSegmentKey) {
    window.activeChartBookSegment = targetSegmentKey;
    const btn1 = document.getElementById("chartSegmentBtnS1");
    const btn2 = document.getElementById("chartSegmentBtnS2");
    
    if (targetSegmentKey === "section1") {
        if(btn1) btn1.className = "px-3 py-1 bg-blue-600 text-white rounded font-bold font-mono text-[10px]";
        if(btn2) btn2.className = "px-3 py-1 bg-slate-200 dark:bg-gray-800 text-slate-500 rounded font-medium font-mono text-[10px]";
    } else {
        if(btn2) btn2.className = "px-3 py-1 bg-blue-600 text-white rounded font-bold font-mono text-[10px]";
        if(btn1) btn1.className = "px-3 py-1 bg-slate-200 dark:bg-gray-800 text-slate-500 rounded font-medium font-mono text-[10px]";
    }
    updateChartsDisplay();
}

// Global navigation controller for panning across the dense chart timeline canvas
function scrollLineChartTimeline(direction) {
    const wrapper = document.getElementById("lineChartScrollWrapper");
    if (!wrapper) return;
    const scrollMovementStep = 220; // Panning step delta in pixels
    if (direction === 'left') {
        wrapper.scrollBy({ left: -scrollMovementStep, behavior: 'smooth' });
    } else {
        wrapper.scrollBy({ left: scrollMovementStep, behavior: 'smooth' });
    }
}

function updateChartsDisplay() {
    if (activeViewMode === 'dashboard') return;

    const currentSection = window.activeChartBookSegment || "section1";
    const records = appStateStore[currentSection];
    
    const isDark = document.documentElement.classList.contains('dark');
    const gridColorValue = isDark ? '#1f2937' : '#e2e8f0';
    const labelColorValue = isDark ? '#9ca3af' : '#64748b';

    if (!records || Object.keys(records).length === 0) {
        if (lineChartInstance) { lineChartInstance.destroy(); lineChartInstance = null; }
        if (lineYAxisInstance) { lineYAxisInstance.destroy(); lineYAxisInstance = null; }
        if (barChartInstance) { barChartInstance.destroy(); barChartInstance = null; }
        return;
    }

    // --------------------------------------------------------------------------
    // DYNAMIC FILTER SYNCHRONIZATION
    // --------------------------------------------------------------------------
    const allDates = Object.keys(records).sort((a, b) => new Date(a) - new Date(b));
    let sortedTimelineDates = allDates;
    
    if (typeof currentLedgerDateFilter !== 'undefined' && currentLedgerDateFilter !== "all") {
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        
        if (currentLedgerDateFilter === "custom" && customStartDate && customEndDate) {
            const start = new Date(customStartDate);
            const end = new Date(customEndDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999); 
            
            sortedTimelineDates = allDates.filter(dateStr => {
                const logDate = new Date(dateStr);
                return logDate >= start && logDate <= end;
            });
        } else {
            const daysToFilter = parseInt(currentLedgerDateFilter);
            sortedTimelineDates = allDates.filter(dateStr => {
                const logDate = new Date(dateStr);
                logDate.setHours(0, 0, 0, 0);
                const diffTime = Math.abs(today - logDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= daysToFilter;
            });
        }
    }

    if (sortedTimelineDates.length === 0) {
        if (lineChartInstance) { lineChartInstance.destroy(); lineChartInstance = null; }
        if (lineYAxisInstance) { lineYAxisInstance.destroy(); lineYAxisInstance = null; }
        if (barChartInstance) { barChartInstance.destroy(); barChartInstance = null; }
        return;
    }

    // ==========================================================================
    // DYNAMIC LAYOUT RESPONSIVENESS AND ARROW TOGGLE MATH
    // ==========================================================================
    const scrollWrapper = document.getElementById("lineChartScrollWrapper");
    const resizeContainer = document.getElementById("lineChartResizeContainer");
    const navControls = document.getElementById("chartScrollNavigationControls");
    const headingHeader = document.getElementById("chartTimelineMonthHeader");

    if (scrollWrapper && resizeContainer && navControls) {
        const standardPointBreathingSpace = 55; // Secure pixel allocation width per log date element
        const parentElementAvailableWidth = scrollWrapper.clientWidth || 600;
        const requiredCalculatedWidth = sortedTimelineDates.length * standardPointBreathingSpace;

        if (requiredCalculatedWidth > parentElementAvailableWidth) {
            resizeContainer.style.width = requiredCalculatedWidth + "px";
            navControls.classList.remove("opacity-0", "hidden");
            navControls.classList.add("flex");
            // Auto-scroll framework to map straight to the absolute latest log updates
            setTimeout(() => { scrollWrapper.scrollLeft = requiredCalculatedWidth; }, 50);
        } else {
            resizeContainer.style.width = "100%";
            navControls.classList.add("opacity-0", "hidden");
            navControls.classList.remove("flex");
        }
    }

    // Update the Month and Year layout banner header dynamically based on active dates
    if (headingHeader && sortedTimelineDates.length > 0) {
        const initialDateRef = new Date(sortedTimelineDates[0]);
        const ultimateDateRef = new Date(sortedTimelineDates[sortedTimelineDates.length - 1]);
        
        const formatConfigurationOptions = { month: 'long', year: 'numeric' };
        const localizedStartText = initialDateRef.toLocaleDateString('en-US', formatConfigurationOptions);
        const localizedEndText = ultimateDateRef.toLocaleDateString('en-US', formatConfigurationOptions);

        headingHeader.innerText = (localizedStartText === localizedEndText) 
            ? localizedStartText 
            : `${localizedStartText} - ${localizedEndText}`;
    }

    const calculatedLineTotals = sortedTimelineDates.map(date => computeWeightedMatrixTotal(records[date]));

    // ==========================================
    // A. PROGRESSIVE DAILY LINE CHART
    // ==========================================
    const lineCanvasEl = document.getElementById("lineChartCanvas");
    const yAxisCanvasEl = document.getElementById("lineChartYAxisCanvas");

    if (lineCanvasEl && yAxisCanvasEl) {
        const lineCtx = lineCanvasEl.getContext("2d");
        const yAxisCtx = yAxisCanvasEl.getContext("2d");

        if (lineChartInstance) lineChartInstance.destroy();
        if (lineYAxisInstance) lineYAxisInstance.destroy();

        // 1. Sticky Y-Axis Rendering Canvas
        lineYAxisInstance = new Chart(yAxisCtx, {
            type: 'line',
            data: {
                labels: [''], // dummy alignment label
                datasets: [{ data: [0], borderWidth: 0, pointRadius: 0 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                layout: { padding: { left: 0, right: 0, top: 0, bottom: 0 } },
                scales: {
                    x: { 
                        grid: { display: false, drawBorder: false }, 
                        ticks: { color: 'transparent', font: { family: 'monospace', weight: 'bold' } },
                        border: { display: false }
                    },
                    y: { 
                        min: 0, max: 100, reverse: true, 
                        grid: { display: false, drawBorder: false }, 
                        ticks: { color: labelColorValue, font: { family: 'monospace', weight: 'bold' } },
                        border: { display: false }
                    }
                }
            }
        });

        // 2. Main Scrolling Chart Canvas
        lineChartInstance = new Chart(lineCtx, {
            type: 'line',
            data: {
                // Strips month prefixes entirely to print purely clean day markers on the X axis scale ticks
                labels: sortedTimelineDates.map(d => d.split('-')[2]), 
                datasets: [{
                    data: calculatedLineTotals,
                    borderColor: '#10b981',
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.08)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#10b981'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { left: 0, right: 10, top: 0, bottom: 0 } },
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: (context) => `Date: ${sortedTimelineDates[context[0].dataIndex]}`
                        }
                    }
                },
                scales: {
                    y: { 
                        min: 0, max: 100, reverse: true, 
                        grid: { color: gridColorValue, drawTicks: false }, 
                        ticks: { display: false }, // Text hidden, handled by sticky axis
                        border: { display: false }
                    },
                    x: { 
                        grid: { color: gridColorValue }, 
                        ticks: { 
                            color: labelColorValue,
                            font: { family: 'monospace', weight: 'bold' }
                        } 
                    }
                }
            }
        });
    }

    // ==========================================
    // B. COMPARATIVE DELTA BAR CHART
    // ==========================================
    const barCanvasEl = document.getElementById("barChartCanvas");
    if (barCanvasEl) {
        const activeKeywordsArray = keywordsDB[currentSection] || [];
        const totalKeywordsCount = activeKeywordsArray.length;

        const absoluteLatestDate = sortedTimelineDates[sortedTimelineDates.length - 1];
        const latestKeywordRanksSpread = records[absoluteLatestDate] || new Array(totalKeywordsCount).fill(0);
        
        const previousDate = sortedTimelineDates.length > 1 ? sortedTimelineDates[sortedTimelineDates.length - 2] : null;
        const previousKeywordRanksSpread = previousDate ? records[previousDate] : new Array(totalKeywordsCount).fill(0);

        const shortLabelsArray = activeKeywordsArray.map((_, i) => `KW ${i + 1}`);

        // Extract raw scores and map 0 values straight to 10 for accurate visual bar height
        const mappedPreviousData = previousKeywordRanksSpread.map(val => val === 0 ? 10 : val);
        const mappedLatestData = latestKeywordRanksSpread.map(val => val === 0 ? 10 : val);

        const barCtx = barCanvasEl.getContext("2d");
        if (barChartInstance) barChartInstance.destroy();

        barChartInstance = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: shortLabelsArray,
                datasets: [
                    {
                        label: previousDate ? `Previous Run (${previousDate.slice(5)})` : 'Previous Day',
                        data: mappedPreviousData,
                        // Unranked historicals are marked with a muted red to maintain distinction
                        backgroundColor: previousKeywordRanksSpread.map(val => val === 0 ? (isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(248, 113, 113, 0.4)') : (isDark ? '#475569' : '#cbd5e1')), 
                        borderWidth: 0,
                        borderRadius: 4
                    },
                    {
                        label: `Latest Run (${absoluteLatestDate.slice(5)})`,
                        data: mappedLatestData,
                        // Unranked latest targets map strictly to solid red
                        backgroundColor: latestKeywordRanksSpread.map(val => val === 0 ? (isDark ? '#ef4444' : '#f87171') : val === 1 ? '#34d399' : '#3b82f6'),
                        borderWidth: 0,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: (context) => keywordsDB[currentSection][context[0].dataIndex] || "Unknown Keyword",
                            label: (context) => {
                                const dataSetLabel = context.dataset.label;
                                // Recover original values using dataset mapping index to provide accurate tooltip data
                                const originalSpreadArray = context.datasetIndex === 0 ? previousKeywordRanksSpread : latestKeywordRanksSpread;
                                const parsedRankValue = originalSpreadArray[context.dataIndex];
                                return `${dataSetLabel}: Page ${parsedRankValue === 0 ? 'Not Found (0)' : parsedRankValue}`;
                            }
                        }
                    },
                    legend: {
                        display: true,
                        labels: { color: labelColorValue, font: { family: 'monospace', size: 10 } }
                    }
                },
                scales: {
                    y: { 
                        min: 0, 
                        max: 10, 
                        reverse: false, 
                        grid: { color: gridColorValue }, 
                        ticks: { 
                            color: labelColorValue, 
                            stepSize: 1,
                            callback: function(value) { return value === 0 ? '0' : 'P' + value; }
                        } 
                    },
                    x: { grid: { color: gridColorValue }, ticks: { color: labelColorValue } }
                }
            }
        });
    }
}