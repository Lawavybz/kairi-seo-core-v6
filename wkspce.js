// ==========================================================================
// workspace.js - Form Matrix Generator, Extraction Automation, & Sheet Tables (v6 Core)
// ==========================================================================

// 1. Operational State Registries
let workspaceConsoleMode = "view"; 
let configConsoleUIMode = "single"; 
let configConsoleOperationMode = "view"; 
let liveSyncInterval = null; 

// 2. Ledger Filtering State
let currentLedgerDateFilter = "7"; 
let customStartDate = null;
let customEndDate = null;

// --------------------------------------------------------------------------
// NEW: Non-Destructive System Toast UI
// --------------------------------------------------------------------------
const SystemToast = Swal.mixin({ 
    toast: true, 
    position: 'top-end', 
    showConfirmButton: false, 
    timer: 1500 
});

// ==========================================================================
// 3. Dynamic Entry Input Matrix Grid Renderer
// ==========================================================================
function renderInputFieldsMatrix() {
    const clusterToggle = document.getElementById("keywordSet");
    const currentSelectedCluster = clusterToggle ? clusterToggle.value : "section1";
    
    const dateInput = document.getElementById("logDate");
    const selectedDate = dateInput && dateInput.value ? dateInput.value : new Date().toISOString().split('T')[0];

    const fieldsContainer = document.getElementById("dynamicInputsMatrix");
    if (!fieldsContainer) return;
    
    fieldsContainer.innerHTML = "";

    const activePhrasesArray = (typeof keywordsDB !== 'undefined' && keywordsDB[currentSelectedCluster]) ? keywordsDB[currentSelectedCluster] : [];
    
    // Check if the current user is IT Staff to allow them to use the Run button for research
    const isIT = typeof activeSessionUser !== 'undefined' && activeSessionUser && activeSessionUser.role === 'it_staff';

    activePhrasesArray.forEach((phrase, index) => {
        const layoutCard = document.createElement("div");
        layoutCard.className = "bg-slate-100 border border-slate-200 dark:bg-gray-900 dark:border-gray-800 rounded-lg p-3 space-y-1.5 shadow-sm transition-all duration-200";
        
        const wrapper = document.createElement("div");
        wrapper.className = "flex justify-between items-center gap-1";
        
        const label = document.createElement("span");
        label.className = "block font-mono text-[10px] text-slate-500 dark:text-gray-400 truncate max-w-[110px]";
        label.title = phrase;
        label.innerText = `${index + 1}. ${phrase}`;
        
        const actions = document.createElement("div");
        actions.className = "flex gap-1 shrink-0";
        
        const runBtn = document.createElement("button");
        runBtn.type = "button";
        
        // IT Staff bypasses the View Mode restriction for the RUN button only
        if (workspaceConsoleMode === "view" && !isIT) {
            runBtn.disabled = true;
            runBtn.className = "text-[9px] bg-slate-100 dark:bg-gray-850 text-slate-400 dark:text-gray-600 border border-slate-200 dark:border-gray-800 px-1.5 py-0.5 rounded font-mono cursor-not-allowed opacity-50";
            runBtn.innerText = "Run";
        } else {
            runBtn.className = "text-[9px] bg-emerald-100 border border-emerald-300 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-400 px-1.5 py-0.5 rounded hover:bg-emerald-600 hover:text-white font-mono font-bold transition";
            runBtn.innerText = "Run";
            runBtn.addEventListener("click", () => launchSearchAutomation(phrase, index));
        }
        
        const viewBtn = document.createElement("button");
        viewBtn.type = "button";
        viewBtn.className = "text-[9px] bg-slate-200 border border-slate-300 dark:bg-gray-800 dark:border-gray-700 text-slate-600 dark:text-gray-300 px-1 py-0.5 rounded hover:bg-slate-300 dark:hover:bg-gray-700 font-mono transition";
        viewBtn.innerText = "View";
        viewBtn.addEventListener("click", () => verifyFieldTargetRank(index));
        
        actions.appendChild(runBtn);
        actions.appendChild(viewBtn);
        wrapper.appendChild(label);
        wrapper.appendChild(actions);
        
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.max = "10";
        input.required = true;
        input.className = "rank-input w-full bg-white border border-slate-300 dark:bg-gray-950 dark:border-gray-700 rounded-md p-1 text-center text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono font-bold transition-all";
        input.setAttribute("data-index", index);
        
        let existingRank = 0;
        if (typeof appStateStore !== 'undefined' && appStateStore[currentSelectedCluster] && appStateStore[currentSelectedCluster][selectedDate]) {
            existingRank = appStateStore[currentSelectedCluster][selectedDate][index] !== undefined ? appStateStore[currentSelectedCluster][selectedDate][index] : 0;
        }
        input.value = existingRank;
        
        if (workspaceConsoleMode === "view") {
            input.readOnly = true;
            input.className += " bg-slate-50 dark:bg-gray-900 border-slate-200 dark:border-gray-850 text-slate-400 dark:text-gray-500 cursor-not-allowed shadow-none";
        }
        
        layoutCard.appendChild(wrapper);
        layoutCard.appendChild(input);
        fieldsContainer.appendChild(layoutCard);
    });
    
    if (typeof updateChartsDisplay === "function") updateChartsDisplay();
}

// ==========================================================================
// 4. Operational State Mutator Engine
// ==========================================================================
function setWorkspaceOperationMode(targetMode) {
    workspaceConsoleMode = targetMode;
    
    const viewBtn = document.getElementById("workspaceViewModeBtn");
    const editBtn = document.getElementById("workspaceEditModeBtn");
    const instructionsBanner = document.getElementById("workspaceInstructionsBanner");
    const submitBtn = document.getElementById("workspaceFormSubmitBtn");
    
    if (!viewBtn || !editBtn) return;
    
    if (targetMode === "view") {
        viewBtn.className = "px-3 py-1.5 rounded-md font-bold transition-all bg-white dark:bg-gray-800 text-slate-800 dark:text-white shadow-sm";
        editBtn.className = "px-3 py-1.5 rounded-md text-slate-400 dark:text-gray-500 transition-all hover:text-slate-600";
        if (instructionsBanner) instructionsBanner.classList.add("hidden");
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "Console Locked (Switch to Edit Mode to Commit Log Matrices)";
            submitBtn.className = "w-full bg-slate-200 dark:bg-gray-850 text-slate-400 dark:text-gray-600 font-bold uppercase tracking-widest text-xs p-4 rounded-lg cursor-not-allowed transition-all font-mono";
        }
        startLiveSync();
        SystemToast.fire({ icon: 'info', title: 'Workspace View Locked' });
    } else {
        editBtn.className = "px-3 py-1.5 rounded-md font-bold transition-all bg-white dark:bg-gray-800 text-slate-800 dark:text-white shadow-sm";
        viewBtn.className = "px-3 py-1.5 rounded-md text-slate-400 dark:text-gray-500 transition-all hover:text-slate-600";
        if (instructionsBanner) instructionsBanner.classList.remove("hidden");
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = "Process Property Matrix & Commit Entries";
            submitBtn.className = "w-full bg-emerald-600 hover:bg-emerald-500 text-white dark:text-gray-950 font-bold uppercase tracking-widest text-xs p-4 rounded-lg shadow-md transition-all font-mono cursor-pointer";
        }
        stopLiveSync();
        SystemToast.fire({ icon: 'success', title: 'Workspace Edit Activated' });
    }
    renderInputFieldsMatrix();
}

function loadDatabaseRecords() {
    if (typeof syncActiveTenantKeywords === "function") {
        syncActiveTenantKeywords(activeDomainId, () => {
            fetch(`api.php?action=fetch_records&domain_id=${activeDomainId}`)
                .then(response => response.json())
                .then(res => {
                    if (res.status === 'success') {
                        if (!res.data || (!res.data.section1 && !res.data.section2)) {
                            appStateStore = { section1: {}, section2: {} };
                        } else {
                            appStateStore = res.data;
                        }
                        renderInputFieldsMatrix();
                        renderPhysicalSheetsDisplay();
                        if (typeof renderScriptGeneratedInventoryTable === "function") {
                            setTimeout(renderScriptGeneratedInventoryTable, 50);
                        }
                    } else {
                        console.error("Database Core Matrix Response Error:", res.message);
                    }
                })
                .catch(err => {
                    console.error("Critical API Network Pipeline Interruption:", err);
                    renderInputFieldsMatrix();
                });
        });
    }
}

function launchSearchAutomation(phrase, inputFieldIndex) {
    let targetDomainUrl = "kairitravels.com";
    if (typeof corporateDomainsList !== 'undefined') {
        const activeDomainObj = corporateDomainsList.find(d => d.id == activeDomainId);
        if (activeDomainObj) targetDomainUrl = activeDomainObj.site_url;
    }
    
    const targetGoogleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(phrase)}&ktarget=${encodeURIComponent(targetDomainUrl)}&kphrase=${encodeURIComponent(phrase)}`;

    Swal.fire({
        title: 'Search Workspace Dispatched',
        html: `<div class="text-left text-xs font-mono p-1 space-y-1"><p><strong class="text-emerald-500">Target Domain:</strong> ${targetDomainUrl}</p><p style="margin-top: 5px; color: #64748b; font-size: 11px;">Google Search has opened. Click your saved <b>"Scan Rank 🔎"</b> bookmarklet button on the browser bar to sweep the page seamlessly.</p></div>`,
        icon: 'success',
        confirmButtonColor: '#10b981',
        customClass: { popup: 'dark:bg-gray-900 dark:border dark:border-gray-800', title: 'dark:text-white' }
    });

    window.open(targetGoogleSearchUrl, '_blank');
}

function verifyFieldTargetRank(index) {
    const clusterToggle = document.getElementById("keywordSet");
    const currentCluster = clusterToggle ? clusterToggle.value : "section1";
    const phrase = keywordsDB[currentCluster][index];
    Swal.fire({ title: 'Data Inspector Validation', text: `Keyword Target: ${phrase}`, icon: 'info', confirmButtonColor: '#3b82f6', customClass: { popup: 'dark:bg-gray-900 dark:border dark:border-gray-800', title: 'dark:text-white', htmlContainer: 'dark:text-gray-300' } });
}

function commitPayloadToClipboard(compiledCodeText) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(compiledCodeText).catch(err => console.error(err));
}

function displayAutomationSuccessModal(targetDomainUrl) {
    Swal.fire({ title: 'Multi-Page Extractor Ready!', html: `<div class="text-left text-xs font-mono space-y-2"><p><strong class="text-emerald-500">Target Workspace URL:</strong> ${targetDomainUrl}</p></div>`, icon: 'success', confirmButtonColor: '#10b981', customClass: { popup: 'dark:bg-gray-900 dark:border dark:border-gray-800', title: 'dark:text-white' } });
}

function showBookmarkletSetupInstructions() {
    const rawPayload = `javascript:(async function(){if(!window.Swal){var r=document.createElement("script");r.src="https://cdn.jsdelivr.net/npm/sweetalert2@11";document.head.appendChild(r);await new Promise((e=>r.onload=e))}var e=new URLSearchParams(window.location.search),t=e.get("ktarget")||sessionStorage.getItem("kairi_target_vector"),n=e.get("kphrase")||sessionStorage.getItem("kairi_phrase_vector");if(!t||!n){Swal.fire({width:600,title:"Automation Context Missing",text:"Please launch this search vector directly from your dashboard.",icon:"warning",confirmButtonColor:"#3b82f6"});return}sessionStorage.setItem("kairi_target_vector",t);sessionStorage.setItem("kairi_phrase_vector",n);var a=e.get("start")||"0",o=parseInt(a)/10+1,i=t.replace(/^(https?:\\/\\/)?(www\\.)?/,"").toLowerCase(),c=document.getElementById("search")||document.body,l=!1,s=c.querySelectorAll("a");for(var m=0;m<s.length;m++)if(s[m].href){var h=s[m].hostname.toLowerCase();if(h.includes("google"))continue;if(s[m].href.toLowerCase().includes(i)){l=!0;break}}if(l)Swal.fire({width:600,title:"Target Identified!",html:'<div style="font-family: \\'Segoe UI\\', system-ui, sans-serif; text-align: left;"><div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px;"><div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Search Progress</div><div style="font-size: 14px; color: #0f172a; font-weight: 600;">Found on Page '+o+' of 10</div></div><div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px;"><div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Target Website</div><div style="font-size: 14px; color: #0f172a; font-weight: 600;">'+i+'</div></div><div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px;"><div style="font-size: 11px; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Identified Placement</div><div style="font-size: 16px; color: #047857; font-weight: 700;">Page '+o+'</div></div></div>',icon:"success",showCancelButton:!0,confirmButtonColor:"#10b981",cancelButtonColor:"#94a3b8",confirmButtonText:"🔗 Copy Index ("+o+")",cancelButtonText:"Dismiss",backdrop:"rgba(15, 23, 42, 0.85)"}).then((e=>{e.isConfirmed&&navigator.clipboard.writeText(o.toString()).then((()=>window.close()))}));else if(o<10){var p=o+1,u=10*o;e.set("start",u);var w=window.location.pathname+"?"+e.toString();Swal.fire({width:600,title:"Page "+o+" of 10 Scanned",html:'<div style="font-family: \\'Segoe UI\\', system-ui, sans-serif; text-align: left;"><div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px;"><div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Search Progress</div><div style="font-size: 14px; color: #0f172a; font-weight: 600;">Scanning Page '+o+' out of 10</div></div><div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px;"><div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Target Website</div><div style="font-size: 14px; color: #0f172a; font-weight: 600;">'+i+'</div></div><div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;"><p style="font-size: 14px; color: #334155; margin: 0 0 8px 0;">The target property was not found on this page.</p><p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.5;">To avoid Google bot flags, navigate safely using the button below. <br><br><b style="color: #0f172a; display: inline-block; padding: 6px 10px; background: #e2e8f0; border-radius: 4px;">Click the scanner again once Page '+p+' loads.</b></p></div></div>',icon:"info",showCancelButton:!0,confirmButtonColor:"#3b82f6",cancelButtonColor:"#ef4444",confirmButtonText:"Load Page "+p+" ➔",cancelButtonText:"Mark Unranked (0)",backdrop:"rgba(15, 23, 42, 0.85)"}).then((e=>{e.isConfirmed?window.location.href=w:e.dismiss===Swal.DismissReason.cancel&&navigator.clipboard.writeText("0").then((()=>window.close()))}))}else Swal.fire({width:600,title:"Phrase Unranked! (10 Pages Checked)",html:'<div style="font-family: \\'Segoe UI\\', system-ui, sans-serif; text-align: left;"><div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px;"><div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Search Progress</div><div style="font-size: 14px; color: #0f172a; font-weight: 600;">Reached Page 10 of 10 limit</div></div><div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px;"><div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Target Website</div><div style="font-size: 14px; color: #0f172a; font-weight: 600;">'+i+'</div></div><div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px;"><div style="font-size: 11px; color: #dc2626; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Identified Placement</div><div style="font-size: 14px; color: #b91c1c; font-weight: 600;">Not found within top 10 positions (0)</div></div></div>',icon:"warning",showCancelButton:!0,confirmButtonColor:"#10b981",cancelButtonColor:"#94a3b8",confirmButtonText:"🔗 Copy Index (0)",cancelButtonText:"Dismiss",backdrop:"rgba(15, 23, 42, 0.85)"}).then((e=>{e.isConfirmed&&navigator.clipboard.writeText("0").then((()=>window.close()))}))})();`;
    const safePayload = rawPayload.replace(/'/g, "&apos;").replace(/"/g, "&quot;");

    Swal.fire({
        title: 'Setup Quick-Scan Bookmarklet',
        width: 600,
        customClass: { popup: 'dark:bg-gray-900 dark:border dark:border-gray-800', title: 'dark:text-white', htmlContainer: 'dark:text-gray-300' },
        html: `
            <div class="text-left font-mono text-sm space-y-4 text-slate-600 dark:text-gray-300">
                <p>To automate extracting rankings from Google Search, you need to add our scanner button to your browser's bookmarks bar.</p>
                <div class="p-4 bg-slate-100 dark:bg-gray-800/50 border border-slate-200 dark:border-gray-700/50 rounded-lg shadow-inner">
                    <strong class="text-emerald-600 dark:text-emerald-400">Step 1:</strong> Ensure your Browser Bookmarks Bar is visible (Press <kbd class="bg-slate-200 dark:bg-gray-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-gray-700 dark:text-gray-200">Ctrl+Shift+B</kbd>).<br><br>
                    <strong class="text-emerald-600 dark:text-emerald-400">Step 2:</strong> Click and drag the button below into your bookmarks bar.<br><br>
                    <div class="flex justify-center my-5">
                        <a href="${safePayload}" onclick="event.preventDefault();" class="px-4 py-2 bg-slate-200 dark:bg-gray-800 border border-slate-300 dark:border-gray-600 text-slate-800 dark:text-gray-200 text-sm font-sans font-medium rounded shadow cursor-grab active:cursor-grabbing hover:bg-slate-300 dark:hover:bg-gray-700 transition select-none inline-flex items-center gap-1.5" title="Drag me to your bookmarks bar!">Scan Rank 🔎</a>
                    </div>
                    <strong class="text-emerald-600 dark:text-emerald-400">Step 3:</strong> Whenever you launch a search from the matrix, click the saved bookmark to trigger the automated extraction!
                </div>
            </div>
        `,
        icon: 'info',
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'Got it, let\'s go!'
    });
}

function renderPhysicalSheetsDisplay() {
    ["section1", "section2"].forEach(sectionKey => {
        const targetSheetTable = document.getElementById(sectionKey === 'section1' ? 'sheetTableSection1' : 'sheetTableSection2');
        if (!targetSheetTable) return;
        
        const headerRow = targetSheetTable.querySelector("thead tr");
        const bodyContainer = targetSheetTable.querySelector("tbody");

        headerRow.innerHTML = '<th class="p-3 w-[250px] text-slate-500 dark:text-gray-400">Keywords List</th>';
        bodyContainer.innerHTML = "";

        const allDates = Object.keys(appStateStore[sectionKey] || {}).sort((a, b) => new Date(a) - new Date(b));
        let chronologicalDates = allDates;
        
        if (currentLedgerDateFilter !== "all") {
            const today = new Date();
            today.setHours(0, 0, 0, 0); 
            
            if (currentLedgerDateFilter === "custom" && customStartDate && customEndDate) {
                const start = new Date(customStartDate);
                const end = new Date(customEndDate);
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999); 
                
                chronologicalDates = allDates.filter(dateStr => {
                    const logDate = new Date(dateStr);
                    return logDate >= start && logDate <= end;
                });
            } else {
                const daysToFilter = parseInt(currentLedgerDateFilter);
                chronologicalDates = allDates.filter(dateStr => {
                    const logDate = new Date(dateStr);
                    logDate.setHours(0, 0, 0, 0);
                    const diffTime = Math.abs(today - logDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays <= daysToFilter;
                });
            }
        }

        if (chronologicalDates.length === 0) {
            bodyContainer.innerHTML = `<tr><td colspan="12" class="p-4 text-center font-mono text-gray-500">No active matrix history recorded for the selected timeframe.</td></tr>`;
            return;
        }

        chronologicalDates.forEach(date => {
            const dateTh = document.createElement("th");
            dateTh.className = "p-3 text-center border-l border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-400 whitespace-nowrap";
            dateTh.innerText = date.slice(5); 
            headerRow.appendChild(dateTh);
        });

        const activePhrasesArray = keywordsDB[sectionKey] || [];
        activePhrasesArray.forEach((phrase, keywordIndex) => {
            const tableRow = document.createElement("tr");
            tableRow.className = "hover:bg-slate-50 dark:hover:bg-gray-900/40 transition border-b border-slate-200 dark:border-gray-850";
            let cellsMarkup = `<td class="p-3 font-medium text-slate-600 dark:text-gray-400 text-[11px] max-w-[240px] truncate" title="${phrase}">${keywordIndex + 1}. ${phrase}</td>`;
            tableRow.innerHTML = cellsMarkup;

            chronologicalDates.forEach(date => {
                const dayLogSpread = appStateStore[sectionKey][date] || [];
                const checkedPageRank = dayLogSpread[keywordIndex] !== undefined ? dayLogSpread[keywordIndex] : 0;
                
                const td = document.createElement("td");
                td.className = `p-3 text-center border-l border-slate-200 dark:border-gray-800 font-bold font-mono text-xs ${checkedPageRank === 0 ? 'text-red-500/40 dark:text-red-500/30' : checkedPageRank === 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`;
                td.innerText = checkedPageRank;
                tableRow.appendChild(td);
            });
            bodyContainer.appendChild(tableRow);
        });

        const totalCalculationsRow = document.createElement("tr");
        totalCalculationsRow.className = "bg-slate-100 dark:bg-gray-900/50 font-bold border-t border-slate-300 dark:border-gray-700";
        totalCalculationsRow.innerHTML = '<td class="p-3 text-emerald-600 dark:text-emerald-400 tracking-wider text-xs uppercase font-bold">DAILY TOTAL (WEIGHTED)</td>';
        
        chronologicalDates.forEach(date => {
            const sumTotal = typeof computeWeightedMatrixTotal === "function" ? computeWeightedMatrixTotal(appStateStore[sectionKey][date]) : 0;
            const calculatedCell = document.createElement("td");
            calculatedCell.className = "p-3 text-center border-l border-slate-200 dark:border-gray-800 text-sm font-bold text-emerald-600 dark:text-emerald-400";
            calculatedCell.innerText = sumTotal;
            totalCalculationsRow.appendChild(calculatedCell);
        });
        bodyContainer.appendChild(totalCalculationsRow);
    });
}

function changeLedgerDateFilter(filterValue) {
    currentLedgerDateFilter = filterValue;
    const customDateContainer = document.getElementById("customDateRangeFilterUI");
    
    if (filterValue === "custom") {
        if(customDateContainer) {
            customDateContainer.classList.remove("hidden");
            customDateContainer.classList.add("flex");
        }
    } else {
        if(customDateContainer) {
            customDateContainer.classList.add("hidden");
            customDateContainer.classList.remove("flex");
        }
        renderPhysicalSheetsDisplay(); 
    }
}

function applyCustomDateFilter() {
    customStartDate = document.getElementById("ledgerCustomStart").value;
    customEndDate = document.getElementById("ledgerCustomEnd").value;
    
    if (customStartDate && customEndDate) {
        renderPhysicalSheetsDisplay();
    } else {
        Swal.fire({ title: 'Invalid Filter', text: 'Please select both a start and end date to filter the ledger.', icon: 'warning', confirmButtonColor: '#3b82f6' });
    }
}

if (document.getElementById("seoLoggerForm")) {
    document.getElementById("seoLoggerForm").addEventListener("submit", function(event) {
        event.preventDefault();
        
        if (workspaceConsoleMode === "view") {
            Swal.fire({ title: "Console Is Locked", text: "Please transition workspace to Edit Mode to post data records.", icon: "warning", confirmButtonColor: "#3b82f6" });
            return;
        }

        const selectedSetKey = document.getElementById("keywordSet").value;
        const pickedDateString = document.getElementById("logDate").value;
        const domInputElements = document.querySelectorAll(".rank-input");
        
        const totalKeywordsInActiveSet = (keywordsDB[selectedSetKey] || []).length;
        const newlyConstructedDataArray = new Array(totalKeywordsInActiveSet).fill(0);
        
        domInputElements.forEach(inputNode => {
            const parsedIdx = parseInt(inputNode.getAttribute("data-index"));
            if (parsedIdx < totalKeywordsInActiveSet) {
                newlyConstructedDataArray[parsedIdx] = parseInt(inputNode.value) || 0;
            }
        });

        fetch('api.php?action=save_matrix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain_id: activeDomainId, date: pickedDateString, cluster_set: selectedSetKey, rankings: newlyConstructedDataArray })
        })
        .then(response => response.json())
        .then(res => {
            if (res.status === 'success') {
                loadDatabaseRecords();
                
                if (activeSessionUser && activeSessionUser.role === 'user') {
                    if (typeof setWorkspaceOperationMode === "function") {
                        setWorkspaceOperationMode('view');
                    }
                }
                
                Swal.fire({
                    title: 'Task Completed!',
                    text: 'Matrix submitted successfully. Your task board has been updated to Complete.',
                    icon: 'success',
                    confirmButtonColor: '#10b981'
                });
            } else {
                Swal.fire({ 
                    title: 'Action Prohibited', 
                    text: res.message || 'You do not have permission to commit this data.', 
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
            }
        })
        .catch(err => {
            Swal.fire({ title: 'Critical Connection Failure', text: 'Backend endpoint returned offline responses.', icon: 'error' });
        });
    });
}

// ==========================================================================
// 9. Decoupled Keyword Configuration Console Drivers
// ==========================================================================
function switchConfigUIMode(targetTab) {
    configConsoleUIMode = targetTab;
    const singleTabBtn = document.getElementById("configSingleModeTabBtn");
    const batchTabBtn = document.getElementById("configBatchModeTabBtn");
    const singleWrapper = document.getElementById("configFormSinglePropertyWrapper");
    const batchWrapper = document.getElementById("configFormBatchPropertyWrapper");
    
    if (!singleTabBtn || !batchTabBtn) return;
    
    if (targetTab === "single") {
        singleTabBtn.className = "px-4 py-2.5 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-black";
        batchTabBtn.className = "px-4 py-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 font-medium";
        if (singleWrapper) singleWrapper.classList.remove("hidden");
        if (batchWrapper) batchWrapper.classList.add("hidden");
    } else {
        batchTabBtn.className = "px-4 py-2.5 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-black";
        singleTabBtn.className = "px-4 py-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 font-medium";
        if (batchWrapper) batchWrapper.classList.remove("hidden");
        if (singleWrapper) singleWrapper.classList.add("hidden");
    }
    
    // Ensure the interface triggers a fresh sync when shifting tabs
    populateConfigManagerFields();
}

function setConfigOperationMode(targetMode) {
    configConsoleOperationMode = targetMode;
    const viewBtn = document.getElementById("configViewModeBtn");
    const editBtn = document.getElementById("configEditModeBtn");
    
    if (!viewBtn || !editBtn) return;
    
    if (targetMode === "view") {
        viewBtn.className = "px-3 py-1.5 rounded-md font-bold transition-all bg-white dark:bg-gray-800 text-slate-800 dark:text-white shadow-sm";
        editBtn.className = "px-3 py-1.5 rounded-md text-slate-400 dark:text-gray-500 transition-all hover:text-slate-600";
        SystemToast.fire({ icon: 'info', title: 'Configuration Console Locked' });
    } else {
        editBtn.className = "px-3 py-1.5 rounded-md font-bold transition-all bg-white dark:bg-gray-800 text-slate-800 dark:text-white shadow-sm";
        viewBtn.className = "px-3 py-1.5 rounded-md text-slate-400 dark:text-gray-500 transition-all hover:text-slate-600";
        SystemToast.fire({ icon: 'success', title: 'Configuration Console Unlocked' });
    }
    populateConfigManagerFields();
}

async function populateConfigManagerFields() {
    const selectElement = document.getElementById("configClusterSelect");
    const clusterKey = selectElement ? selectElement.value : "section1";
    
    const labelsMap = { "section1": "Green Book: High-Volume Core Terms", "section2": "Black Book: Accommodations & Camps" };
    const labelInput = document.getElementById("configClusterLabelInput");
    if (labelInput) { labelInput.value = labelsMap[clusterKey] || ""; }

    const gridContainer = document.getElementById("configDynamicKeywordInputsGrid");
    const updateMatrixBtn = document.getElementById("configUpdateMatrixBtn");
    const saveStrategyBtn = document.getElementById("configSaveStrategyBtn");
    
    if (!gridContainer) return;

    // --- SINGLE DOMAIN MODE ---
    if (configConsoleUIMode === "single") {
        const targetId = document.getElementById("configClusterTargetDomain") ? document.getElementById("configClusterTargetDomain").value : null;
        if (!targetId) return;

        gridContainer.innerHTML = `<div class="col-span-2 p-4 text-center text-slate-500 font-mono text-xs">Syncing single workspace data...</div>`;
        if(updateMatrixBtn) updateMatrixBtn.disabled = true;
        if(saveStrategyBtn) saveStrategyBtn.disabled = true;

        fetch(`api.php?action=fetch_tenant_keywords_metadata&domain_id=${targetId}`)
        .then(r => r.json())
        .then(res => {
            if (res.status === 'success' && res.data) {
                keywordsDB.section1 = res.data.section1 || [];
                keywordsDB.section2 = res.data.section2 || [];
            } else {
                keywordsDB.section1 = [];
                keywordsDB.section2 = [];
            }
            renderConfigInputsGrid(clusterKey);
        }).catch(err => {
            gridContainer.innerHTML = `<div class="col-span-2 p-4 text-center text-red-500 font-mono text-xs">Connection Error</div>`;
        });
    } 
    // --- MULTI-TENANT BATCH MODE ---
    else {
        const selectedCbs = Array.from(document.querySelectorAll("input[name='batch_domains[]']:checked"));
        if (selectedCbs.length === 0) {
            gridContainer.innerHTML = `<div class="col-span-2 p-4 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-300 dark:border-gray-700 rounded-lg shadow-sm">Select one or more target workspaces from the left panel to view and batch edit their matrix.</div>`;
            if(updateMatrixBtn) { updateMatrixBtn.disabled = true; updateMatrixBtn.className = "w-full bg-slate-200 dark:bg-gray-850 text-slate-400 dark:text-gray-600 font-bold uppercase tracking-widest text-xs p-4 rounded-lg cursor-not-allowed transition-all font-mono"; }
            if(saveStrategyBtn) { saveStrategyBtn.disabled = true; saveStrategyBtn.className = "w-full bg-slate-200 dark:bg-gray-850 text-slate-400 dark:text-gray-600 font-bold uppercase tracking-widest text-xs p-3 rounded-lg cursor-not-allowed transition-all font-mono"; }
            return;
        }

        gridContainer.innerHTML = `<div class="col-span-2 p-4 text-center text-slate-500 font-mono text-xs">Synchronizing multi-tenant data from server...</div>`;
        if(updateMatrixBtn) updateMatrixBtn.disabled = true;
        if(saveStrategyBtn) saveStrategyBtn.disabled = true;

        try {
            const fetchPromises = selectedCbs.map(cb => fetch(`api.php?action=fetch_tenant_keywords_metadata&domain_id=${cb.value}`).then(r => r.json()));
            const results = await Promise.all(fetchPromises);
            
            let referenceArray1 = null;
            let referenceArray2 = null;
            let isMismatch = false;

            for (let i = 0; i < results.length; i++) {
                const res = results[i];
                if (res.status !== 'success') throw new Error("API Error");
                
                const phrases1 = res.data.section1 || [];
                const phrases2 = res.data.section2 || [];
                
                if (referenceArray1 === null) {
                    referenceArray1 = phrases1;
                    referenceArray2 = phrases2;
                } else {
                    const currentPhrases = clusterKey === 'section1' ? phrases1 : phrases2;
                    const refPhrases = clusterKey === 'section1' ? referenceArray1 : referenceArray2;

                    if (refPhrases.length !== currentPhrases.length || !refPhrases.every((val, idx) => val === currentPhrases[idx])) {
                        isMismatch = true;
                        break;
                    }
                }
            }

            if (isMismatch) {
                gridContainer.innerHTML = `
                    <div class="col-span-2 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg shadow-inner">
                        <h4 class="text-rose-600 dark:text-rose-400 font-bold text-xs mb-1 flex items-center gap-2"><i data-lucide="alert-triangle" class="w-4 h-4"></i> Configuration Mismatch Detected</h4>
                        <p class="text-slate-600 dark:text-gray-400 text-[11px] font-mono leading-relaxed">The selected properties have conflicting keyword records for the <span class="font-bold uppercase">${clusterKey === 'section1' ? 'Green' : 'Black'} Book</span>. To prevent accidental data overwrites and corruption, batch editing is temporarily locked.</p>
                        <p class="text-slate-600 dark:text-gray-400 text-[11px] font-mono mt-2"><strong>Resolution:</strong> Align their phrases individually in Single Workspace mode first, or only select properties that match exactly.</p>
                    </div>`;
                if(updateMatrixBtn) { updateMatrixBtn.disabled = true; updateMatrixBtn.className = "w-full bg-slate-200 dark:bg-gray-850 text-slate-400 dark:text-gray-600 font-bold uppercase tracking-widest text-xs p-4 rounded-lg cursor-not-allowed transition-all font-mono"; }
                if(saveStrategyBtn) { saveStrategyBtn.disabled = true; saveStrategyBtn.className = "w-full bg-slate-200 dark:bg-gray-850 text-slate-400 dark:text-gray-600 font-bold uppercase tracking-widest text-xs p-3 rounded-lg cursor-not-allowed transition-all font-mono"; }
                if(typeof lucide !== 'undefined') lucide.createIcons();
            } else {
                keywordsDB.section1 = referenceArray1 || [];
                keywordsDB.section2 = referenceArray2 || [];
                renderConfigInputsGrid(clusterKey);
            }

        } catch(e) {
            gridContainer.innerHTML = `<div class="col-span-2 p-4 text-center text-red-500 font-mono text-xs">Failed to synchronize batch data from the database.</div>`;
        }
    }
}

function renderConfigInputsGrid(clusterKey) {
    const gridContainer = document.getElementById("configDynamicKeywordInputsGrid");
    const updateMatrixBtn = document.getElementById("configUpdateMatrixBtn");
    const saveStrategyBtn = document.getElementById("configSaveStrategyBtn");
    
    gridContainer.innerHTML = "";

    const activeKeywordsArray = keywordsDB[clusterKey] || [];
    
    activeKeywordsArray.forEach((currentPhraseValue, i) => {
        const inputWrapper = document.createElement("div");
        inputWrapper.className = "space-y-1 bg-slate-50/50 dark:bg-gray-900/30 p-2.5 rounded-lg border border-slate-100 dark:border-gray-850 transition-all";
        
        let readonlyAttr = configConsoleOperationMode === "view" ? "readonly" : "";
        let inputClassList = configConsoleOperationMode === "view" 
            ? "w-full bg-slate-100 border border-slate-200 dark:bg-gray-950 border-gray-850 rounded-lg p-2.5 text-xs font-mono text-slate-400 dark:text-gray-500 cursor-not-allowed"
            : "w-full bg-white border border-slate-200 dark:bg-gray-950 border-gray-800 rounded-lg p-2.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500";
            
        let deleteButtonHTML = configConsoleOperationMode === "edit" 
            ? `<button type="button" onclick="removeKeywordSlotFromDOM('${clusterKey}', ${i})" class="text-[10px] text-red-500 font-mono hover:underline focus:outline-none">Remove Slot</button>`
            : '';

        inputWrapper.innerHTML = `
            <div class="flex justify-between items-center">
                <label class='block text-[10px] font-mono text-slate-400 dark:text-gray-500 uppercase tracking-wider'>Slot Phrase Index ${i + 1}</label>
                ${deleteButtonHTML}
            </div>
            <input type='text' name='keyword_slots[]' value='${currentPhraseValue.replace(/'/g, "&apos;")}' ${readonlyAttr} required class='${inputClassList}'>
        `;
        gridContainer.appendChild(inputWrapper);
    });

    if (configConsoleOperationMode === "edit") {
        const actionContainer = document.createElement("div");
        actionContainer.className = "sm:col-span-2 pt-2";
        actionContainer.innerHTML = `<button type="button" onclick="addNewKeywordSlotToDOM('${clusterKey}')" class="w-full py-2.5 border-2 border-dashed border-slate-300 dark:border-gray-750 text-slate-500 dark:text-gray-400 text-xs font-mono rounded-lg hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-all bg-transparent">➕ Add New Keyword Slot Phrase To Matrix</button>`;
        gridContainer.appendChild(actionContainer);
        
        if (updateMatrixBtn) { updateMatrixBtn.disabled = false; updateMatrixBtn.className = "w-full bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest text-xs p-4 rounded-lg shadow-md transition font-mono cursor-pointer"; }
        if (saveStrategyBtn) { saveStrategyBtn.disabled = false; saveStrategyBtn.className = "w-full bg-emerald-600 hover:bg-emerald-500 text-white dark:text-gray-950 font-bold uppercase tracking-widest text-xs p-3 rounded-lg shadow-md transition font-mono cursor-pointer"; }
    } else {
        if (updateMatrixBtn) { updateMatrixBtn.disabled = true; updateMatrixBtn.className = "w-full bg-slate-200 dark:bg-gray-850 text-slate-400 dark:text-gray-600 font-bold uppercase tracking-widest text-xs p-4 rounded-lg cursor-not-allowed transition-all font-mono"; }
        if (saveStrategyBtn) { saveStrategyBtn.disabled = true; saveStrategyBtn.className = "w-full bg-slate-200 dark:bg-gray-850 text-slate-400 dark:text-gray-600 font-bold uppercase tracking-widest text-xs p-3 rounded-lg cursor-not-allowed transition-all font-mono"; }
    }

    if (typeof renderScriptGeneratedInventoryTable === "function") {
        renderScriptGeneratedInventoryTable();
    }
}

function addNewKeywordSlotToDOM(clusterKey) {
    if (!keywordsDB[clusterKey]) keywordsDB[clusterKey] = [];
    keywordsDB[clusterKey].push(""); 
    populateConfigManagerFields();   
}

function removeKeywordSlotFromDOM(clusterKey, indexTarget) {
    if (keywordsDB[clusterKey] && keywordsDB[clusterKey][indexTarget] !== undefined) {
        keywordsDB[clusterKey].splice(indexTarget, 1);
        populateConfigManagerFields(); 
    }
}

// ==========================================================================
// 10. Script-Generated Interactive Keyword Inventory Table
// ==========================================================================
const inventoryTableState = { searchQuery: "", selectedCluster: "all", currentPage: 1, recordsPerPage: 5 };

function renderScriptGeneratedInventoryTable() {
    const masterContainer = document.getElementById("scriptGeneratedMasterInventoryContainer");
    if (!masterContainer) return;

    const htmlScaffolding = "<div class='flex flex-col gap-4'>" +
        "    <div class='flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 dark:border-gray-800 pb-4 gap-3'>" +
        "        <div>" +
        "            <h3 class='text-sm font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase font-mono flex items-center gap-2'><i data-lucide='list-collapse' class='w-4 h-4'></i> Master Keywords Registry Database</h3>" +
        "            <p class='text-[10px] font-mono text-slate-400 dark:text-gray-500 mt-0.5'>Dynamic script-generated system inventory grid</p>" +
        "        </div>" +
        "        <div class='flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto'>" +
        "            <div class='relative w-full sm:w-64'>" +
        "                <input type='text' id='inventorySearchInput' value='" + inventoryTableState.searchQuery + "' placeholder='Search keyword phrase...' class='w-full bg-slate-50 border border-slate-200 dark:bg-gray-900 dark:border-gray-800 rounded-lg py-2 pl-3 pr-8 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500'>" +
        "                <i data-lucide='search' class='w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5'></i>" +
        "            </div>" +
        "            <select id='inventoryClusterSelect' class='w-full sm:w-56 bg-slate-50 border border-slate-200 dark:bg-gray-900 dark:border-gray-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500'>" +
        "                <option value='all' " + (inventoryTableState.selectedCluster === "all" ? "selected" : "") + ">All Group Categories</option>" +
        "                <option value='section1' " + (inventoryTableState.selectedCluster === "section1" ? "selected" : "") + ">Green Book Phrases</option>" +
        "                <option value='section2' " + (inventoryTableState.selectedCluster === "section2" ? "selected" : "") + ">Black Book Phrases</option>" +
        "            </select>" +
        "        </div>" +
        "    </div>" +
        "    <div class='overflow-x-auto'>" +
        "        <table class='w-full text-left text-xs border-collapse min-w-[600px]' id='dynamicInventoryTableElement'>" +
        "            <thead>" +
        "                <tr class='border-b border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-400 font-mono bg-slate-50 dark:bg-gray-900/40'>" +
        "                    <th class='p-3'>Phrase Index Mapping</th>" +
        "                    <th class='p-3'>Assigned Cluster Category Label</th>" +
        "                    <th class='p-3 text-right'>Console Action Vectors</th>" +
        "                </tr>" +
        "            </thead>" +
        "            <tbody class='divide-y divide-slate-100 dark:divide-gray-850 font-mono text-slate-700 dark:text-gray-300'></tbody>" +
        "        </table>" +
        "    </div>" +
        "    <div class='flex items-center justify-between border-t border-slate-100 dark:border-gray-850 pt-4 text-xs font-mono text-slate-400' id='inventoryPaginationControls'></div>" +
        "</div>";

    masterContainer.innerHTML = htmlScaffolding;

    document.getElementById("inventorySearchInput").addEventListener("input", function(e) {
        inventoryTableState.searchQuery = e.target.value.toLowerCase().trim();
        inventoryTableState.currentPage = 1; 
        recompileInventoryDataGrid();
    });

    document.getElementById("inventoryClusterSelect").addEventListener("change", function(e) {
        inventoryTableState.selectedCluster = e.target.value;
        inventoryTableState.currentPage = 1;
        recompileInventoryDataGrid();
    });

    recompileInventoryDataGrid();
}

function recompileInventoryDataGrid() {
    const tbody = document.querySelector("#dynamicInventoryTableElement tbody");
    const paginationWrapper = document.getElementById("inventoryPaginationControls");
    if (!tbody || !paginationWrapper) return;

    tbody.innerHTML = "";
    const sourceData = [];
    const labelsMap = { "section1": "Green Book Phrases", "section2": "Black Book Phrases" };

    if (typeof keywordsDB !== "undefined") {
        if (inventoryTableState.selectedCluster === "all" || inventoryTableState.selectedCluster === "section1") {
            (keywordsDB.section1 || []).forEach(function(kw) { sourceData.push({ phrase: kw, cluster: "section1", clusterLabel: labelsMap.section1 }); });
        }
        if (inventoryTableState.selectedCluster === "all" || inventoryTableState.selectedCluster === "section2") {
            (keywordsDB.section2 || []).forEach(function(kw) { sourceData.push({ phrase: kw, cluster: "section2", clusterLabel: labelsMap.section2 }); });
        }
    }

    const filteredRecordsList = sourceData.filter(function(record) { return record.phrase.toLowerCase().includes(inventoryTableState.searchQuery); });
    const totalRecordsCount = filteredRecordsList.length;
    const totalPagesCalculated = Math.max(1, Math.ceil(totalRecordsCount / inventoryTableState.recordsPerPage));

    if (inventoryTableState.currentPage > totalPagesCalculated) inventoryTableState.currentPage = totalPagesCalculated;

    const startIndex = (inventoryTableState.currentPage - 1) * inventoryTableState.recordsPerPage;
    const endIndex = Math.min(startIndex + inventoryTableState.recordsPerPage, totalRecordsCount);
    const paginatedSlice = filteredRecordsList.slice(startIndex, startIndex + inventoryTableState.recordsPerPage);

    if (paginatedSlice.length === 0) {
        tbody.innerHTML = "<tr><td colspan='3' class='p-6 text-center text-slate-400 dark:text-gray-500 font-mono italic'>No matching phrase matrix elements found.</td></tr>";
        paginationWrapper.innerHTML = "<div>Showing 0 of 0 entries</div><div></div>";
        return;
    }

    paginatedSlice.forEach(function(record) {
        const universalIndexReference = keywordsDB[record.cluster].indexOf(record.phrase);
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50 dark:hover:bg-gray-900/30 transition border-b border-slate-100 dark:border-gray-850 text-xs";
        
        let disabledAttr = configConsoleOperationMode === "view" ? "disabled" : "";
        let btnClasses = configConsoleOperationMode === "view" ? "p-1.5 rounded-md border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-50" : "";

        tr.innerHTML = "<td class='p-3 font-bold text-slate-900 dark:text-white select-all'>" + record.phrase + "</td>" +
            "<td class='p-3'><span class='px-2 py-0.5 text-[10px] rounded border " + (record.cluster === "section1" ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900" : "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-900") + "'>" + record.clusterLabel + "</span></td>" +
            "<td class='p-3 text-right flex justify-end gap-2'>" +
            "    <button " + disabledAttr + " onclick='triggerDynamicRowEditModal(\"" + record.cluster + "\", " + universalIndexReference + ")' class='" + (btnClasses || "p-1.5 rounded-md border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-400 transition shadow-sm") + "' title='Edit Phrase'><i data-lucide='pencil-line' class='w-3.5 h-3.5'></i></button>" +
            "    <button " + disabledAttr + " onclick='triggerDynamicRowDeleteModal(\"" + record.cluster + "\", " + universalIndexReference + ")' class='" + (btnClasses || "p-1.5 rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:border-red-900 dark:text-red-400 transition shadow-sm") + "' title='Delete Phrase'><i data-lucide='trash-2' class='w-3.5 h-3.5'></i></button>" +
            "</td>";
        tbody.appendChild(tr);
    });

    const controlMetaString = "<div>Showing <b class='text-slate-700 dark:text-gray-300'>" + (startIndex + 1) + "</b> to <b class='text-slate-700 dark:text-gray-300'>" + endIndex + "</b> of " + totalRecordsCount + " records</div>";
    let paginationActionButtonsRow = "<div class='flex items-center gap-1'><button " + (inventoryTableState.currentPage === 1 ? "disabled" : "") + " onclick='navigateInventoryPage(" + (inventoryTableState.currentPage - 1) + ")' class='px-2.5 py-1 border border-slate-200 dark:border-gray-800 rounded bg-white dark:bg-gray-900 disabled:opacity-40 font-bold transition hover:bg-slate-50'>&lsaquo;</button>";
    for (let pageNum = 1; pageNum <= totalPagesCalculated; pageNum++) {
        const isCurrentPageActive = (inventoryTableState.currentPage === pageNum);
        paginationActionButtonsRow += "<button onclick='navigateInventoryPage(" + pageNum + ")' class='px-2.5 py-1 border rounded font-bold transition " + (isCurrentPageActive ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200 dark:bg-gray-900 dark:border-gray-800 hover:bg-slate-50") + "'>" + pageNum + "</button>";
    }
    paginationActionButtonsRow += "<button " + (inventoryTableState.currentPage === totalPagesCalculated ? "disabled" : "") + " onclick='navigateInventoryPage(" + (inventoryTableState.currentPage + 1) + ")' class='px-2.5 py-1 border border-slate-200 dark:border-gray-800 rounded bg-white dark:bg-gray-900 disabled:opacity-40 font-bold transition hover:bg-slate-50'>&rsaquo;</button></div>";
    paginationWrapper.innerHTML = controlMetaString + paginationActionButtonsRow;

    if (typeof lucide !== "undefined") { lucide.createIcons(); }
}

function navigateInventoryPage(targetPageNumber) {
    inventoryTableState.currentPage = targetPageNumber;
    recompileInventoryDataGrid();
}

// ==========================================================================
// 11. SweetAlert Master Config Interactive Popups
// ==========================================================================
function triggerDynamicRowEditModal(clusterKey, targetingArrayOffsetIndex) {
    if(configConsoleOperationMode === "view") return;
    const targetedPhraseString = keywordsDB[clusterKey][targetingArrayOffsetIndex];
    
    Swal.fire({
        title: '✏️ Edit Tracked Phrase',
        html: '<div class="text-left font-mono text-[11px] text-slate-400 mb-3 uppercase tracking-wider">Category Focus: ' + clusterKey + '</div>' +
              '<input id="swalEditKeywordInput" type="text" class="w-full max-w-full font-mono text-center text-sm bg-slate-50 border border-slate-300 dark:bg-gray-900 dark:border-gray-700 text-slate-900 dark:text-white rounded-lg p-3 focus:outline-none focus:border-blue-500 box-border" placeholder="Enter keyword string label..." value="' + targetedPhraseString.replace(/"/g, '&quot;') + '">',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Commit Modification',
        cancelButtonText: 'Dismiss Changes',
        preConfirm: function() {
            const inputVal = document.getElementById('swalEditKeywordInput').value.trim();
            if (!inputVal) Swal.showValidationMessage('Keyword phrase text entry cannot map to empty strings!');
            return inputVal;
        }
    }).then(function(result) {
        if (result.isConfirmed && result.value) {
            keywordsDB[clusterKey][targetingArrayOffsetIndex] = result.value;
            recompileInventoryDataGrid();
            if (typeof renderInputFieldsMatrix === "function" && activeViewMode !== 'config') renderInputFieldsMatrix();
            if (typeof populateConfigManagerFields === "function" && activeViewMode === 'config') populateConfigManagerFields();
            SystemToast.fire({ icon: 'success', title: 'Phrase updated!' });
        }
    });
}

function triggerDynamicRowDeleteModal(clusterKey, targetingArrayOffsetIndex) {
    if(configConsoleOperationMode === "view") return;
    const targetedPhraseString = keywordsDB[clusterKey][targetingArrayOffsetIndex];
    Swal.fire({
        title: '🗑️ Delete Keyword Entry?',
        html: '<div class="font-mono text-xs text-left p-3 bg-slate-50 dark:bg-gray-900 border rounded border-slate-200 dark:border-gray-800"><p class="text-slate-500">Are you sure you want to drop this optimization track string from registries?</p><p class="mt-2 font-bold text-red-500 select-all">Target: ' + targetedPhraseString + '</p></div>',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, Drop Phrase',
        cancelButtonText: 'No, Retain Entry'
    }).then(function(result) {
        if (result.isConfirmed) {
            keywordsDB[clusterKey].splice(targetingArrayOffsetIndex, 1);
            recompileInventoryDataGrid();
            if (typeof renderInputFieldsMatrix === "function" && activeViewMode !== 'config') renderInputFieldsMatrix();
            if (typeof populateConfigManagerFields === "function" && activeViewMode === 'config') populateConfigManagerFields();
            SystemToast.fire({ icon: 'success', title: 'Phrase removed!' });
        }
    });
}

// ==========================================================================
// 12. Workspace Performance History Report Ledger Export Agents
// ==========================================================================
function exportWorkspaceLedgerToPDF(sectionKey) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4'); 
    
    const activeDomainObj = corporateDomainsList.find(d => d.id === activeDomainId) || { site_name: "KAIRI PROPERTIES", site_url: "kairitravels.com" };
    const labelMappingString = sectionKey === 'section1' ? "GREEN BOOK - HIGH-VOLUME CORE TERMS" : "BLACK BOOK - ACCOMMODATIONS & CAMPS";

    doc.setFont("courier", "bold");
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129);
    doc.text(`WORKSPACE LEDGER AUDIT: ${activeDomainObj.site_name.toUpperCase()}`, 14, 20);
    
    doc.setFontSize(9);
    doc.setFont("courier", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Target URL Endpoint: ${activeDomainObj.site_url}`, 14, 26);
    doc.text(`Evaluation Matrix Focus Segment Channel: ${labelMappingString}`, 14, 31);
    doc.text("Audit Reference: Matrix Generated View", 14, 36);
    
    doc.setDrawColor(203, 213, 225);
    doc.line(14, 41, 282, 41);

    let verticalCursorOffset = 52;
    
    const targetTableElement = document.getElementById(sectionKey === 'section1' ? 'sheetTableSection1' : 'sheetTableSection2');
    if (!targetTableElement) return;

    const columnHeadersCollection = targetTableElement.querySelectorAll("thead th");
    doc.setFont("courier", "bold");
    doc.setTextColor(15, 23, 42);

    let horizontalXOffset = 14;
    columnHeadersCollection.forEach((th, idx) => {
        const textVal = th.innerText.trim();
        if (idx === 0) {
            doc.text(textVal, horizontalXOffset, verticalCursorOffset);
            horizontalXOffset += 85; 
        } else {
            doc.text(textVal, horizontalXOffset, verticalCursorOffset);
            horizontalXOffset += 32;
        }
    });

    doc.line(14, verticalCursorOffset + 3, 282, verticalCursorOffset + 3);
    verticalCursorOffset += 10;
    doc.setFont("courier", "normal");

    const rowsCollection = targetTableElement.querySelectorAll("tbody tr");
    rowsCollection.forEach((rowNode) => {
        const cells = rowNode.querySelectorAll("td");
        horizontalXOffset = 14;

        if (rowNode.classList.contains("bg-slate-100") || rowNode.classList.contains("dark:bg-gray-900/50")) {
            doc.setFont("courier", "bold");
            doc.line(14, verticalCursorOffset - 2, 282, verticalCursorOffset - 2);
        }

        cells.forEach((cell, cellIdx) => {
            const cellText = cell.innerText.trim();
            if (cellIdx === 0) {
                doc.text(cellText.substring(0, 42), horizontalXOffset, verticalCursorOffset);
                horizontalXOffset += 85;
            } else {
                doc.text(cellText, horizontalXOffset, verticalCursorOffset);
                horizontalXOffset += 32;
            }
        });
        verticalCursorOffset += 7;
    });

    doc.save(`Kairi_Workspace_${activeDomainObj.site_name.replace(/\s+/g, '_')}_${sectionKey}.pdf`);
    SystemToast.fire({ icon: 'success', title: 'PDF Export Downloaded!' });
}

function exportWorkspaceLedgerToExcel(sectionKey) {
    const activeDomainObj = typeof corporateDomainsList !== 'undefined' 
        ? (corporateDomainsList.find(d => d.id === activeDomainId) || { site_name: "KAIRI PROPERTIES" })
        : { site_name: "KAIRI PROPERTIES" };
        
    const labelMappingString = sectionKey === 'section1' ? "Green_Book" : "Black_Book";
    const targetTableElement = document.getElementById(sectionKey === 'section1' ? 'sheetTableSection1' : 'sheetTableSection2');
    if (!targetTableElement) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    
    const headers = [];
    const headerCells = targetTableElement.querySelectorAll("thead th");
    headerCells.forEach(th => { headers.push(`"${th.innerText.trim().replace(/"/g, '""')}"`); });
    csvContent += headers.join(",") + "\r\n";

    const rows = targetTableElement.querySelectorAll("tbody tr");
    rows.forEach(row => {
        const rowData = [];
        const cells = row.querySelectorAll("td");
        cells.forEach(cell => { rowData.push(`"${cell.innerText.trim().replace(/"/g, '""')}"`); });
        csvContent += rowData.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const downloadLink = document.createElement("a");
    downloadLink.setAttribute("href", encodedUri);
    downloadLink.setAttribute("download", `Kairi_Workspace_${activeDomainObj.site_name.replace(/\s+/g, '_')}_${labelMappingString}.csv`);
    
    document.body.appendChild(downloadLink); 
    downloadLink.click();
    document.body.removeChild(downloadLink);

    SystemToast.fire({ icon: 'success', title: 'Excel Export Downloaded!' });
}

// ==========================================================================
// 13. Background Live Sync (Polling)
// ==========================================================================
function startLiveSync() {
    if (typeof liveSyncInterval !== 'undefined' && liveSyncInterval) {
        clearInterval(liveSyncInterval);
    }
    liveSyncInterval = setInterval(function() {
        if (workspaceConsoleMode !== "view") return;
        fetch(`api.php?action=fetch_records&domain_id=${activeDomainId}`)
            .then(response => response.json())
            .then(res => {
                if (res.status === 'success' && res.data) {
                    appStateStore = res.data;
                    renderInputFieldsMatrix(); 
                    renderPhysicalSheetsDisplay();
                }
            })
            .catch(err => console.warn("Live sync background check failed.", err));
    }, 20000);
}

function stopLiveSync() {
    if (typeof liveSyncInterval !== 'undefined' && liveSyncInterval) {
        clearInterval(liveSyncInterval);
        liveSyncInterval = null;
    }
}

// ==========================================================================
// 14. Setup Integration Event Listeners
// ==========================================================================
document.addEventListener("DOMContentLoaded", function() {
    // Add event listeners for the Workspace UI Dropdown and Date Picker
    const keywordSetDropdown = document.getElementById("keywordSet");
    const logDateInput = document.getElementById("logDate");

    if (logDateInput && !logDateInput.value) {
        logDateInput.value = new Date().toISOString().split('T')[0];
    }

    if (keywordSetDropdown) {
        keywordSetDropdown.addEventListener("change", renderInputFieldsMatrix);
    }
    
    if (logDateInput) {
        logDateInput.addEventListener("change", renderInputFieldsMatrix);
    }

    if (workspaceConsoleMode === "view") {
        startLiveSync();
    }
    
    const clusterDropdown = document.getElementById("configClusterSelect");
    const configDomainSelect = document.getElementById("configClusterTargetDomain");
    const categoryForm = document.getElementById("configCategoryForm");
    const keywordsForm = document.getElementById("configKeywordsForm");

    if (clusterDropdown) { 
        clusterDropdown.addEventListener("change", populateConfigManagerFields); 
    }
    
    if (configDomainSelect) { 
        configDomainSelect.addEventListener("change", function() {
            // Fetch the keywords from the database for the newly selected domain, THEN populate the UI
            const newTargetDomainId = this.value;
            if (typeof syncActiveTenantKeywords === "function") {
                syncActiveTenantKeywords(newTargetDomainId, populateConfigManagerFields);
            }
        }); 
    }
    
    // Delegation listener for batch mode checkboxes
    const batchWrapper = document.getElementById("batchDomainsCheckboxContainer");
    if (batchWrapper) {
        batchWrapper.addEventListener("change", function(e) {
            if (e.target.name === 'batch_domains[]') {
                populateConfigManagerFields();
            }
        });
    }

    function submitKeywordConfigurationStrategy() {
        if(configConsoleOperationMode === "view") {
            Swal.fire({ title: "Configuration Blocked", text: "Please flip system administration control engine to edit mode.", icon: "warning" });
            return;
        }
        const inputsCollection = document.querySelectorAll("#configDynamicKeywordInputsGrid input");
        const updatedPhrasesList = [];
        inputsCollection.forEach(function(inputElement) {
            if(inputElement.value.trim() !== "") updatedPhrasesList.push(inputElement.value.trim());
        });
        
        const targetClusterKey = document.getElementById("configClusterSelect").value;
        const dbCategoryEnum = (targetClusterKey === 'section1') ? 'green' : 'black';

        let dynamicPayload = { category_book: dbCategoryEnum, phrases: updatedPhrasesList };

        if (configConsoleUIMode === "single") {
            const singleTargetId = document.getElementById("configClusterTargetDomain").value;
            dynamicPayload.mode = "single";
            dynamicPayload.domain_ids = [parseInt(singleTargetId)];
        } else {
            dynamicPayload.mode = "batch";
            const checkedBoxes = document.querySelectorAll("input[name='batch_domains[]']:checked");
            let checkedIdsArray = [];
            checkedBoxes.forEach(box => checkedIdsArray.push(parseInt(box.value)));
            
            if (checkedIdsArray.length === 0) {
                Swal.fire({ title: "Batch Error", text: "Please choose at least one website target to broadcast batch values.", icon: "error" });
                return;
            }
            dynamicPayload.domain_ids = checkedIdsArray;
        }

        fetch('api.php?action=save_tenant_keywords_config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dynamicPayload)
        })
        .then(response => response.json())
        .then(res => {
            if (res.status === 'success') {
                if (typeof syncActiveTenantKeywords === "function") {
                    syncActiveTenantKeywords(activeDomainId, () => {
                        recompileInventoryDataGrid();
                        if (activeViewMode !== 'config') renderInputFieldsMatrix();
                        if (activeViewMode === 'config') populateConfigManagerFields();
                        SystemToast.fire({ icon: 'success', title: 'Configuration Strategy Deployed!' });
                    });
                }
            } else {
                Swal.fire({ title: "Configuration Write Failure", text: res.message || "Database engine refused transaction.", icon: "error" });
            }
        })
        .catch(err => {
            Swal.fire({ title: "Network Disruption Interruption", text: "Could not reach structural backend metadata channels.", icon: "error" });
        });
    }

    if (categoryForm) {
        categoryForm.addEventListener("submit", function(event) {
            event.preventDefault();
            submitKeywordConfigurationStrategy();
        });
    }

    if (keywordsForm) {
        keywordsForm.addEventListener("submit", function(event) {
            event.preventDefault();
            submitKeywordConfigurationStrategy();
        });
    }

    // --- QUICK-PASTE FOCUS CLIPBOARD AGENT ---
    const modeToggleSwitch = document.getElementById("quickPasteClipboardToggle");
    const statusLabelNode = document.getElementById("quickPasteStatusLabel");

    if (modeToggleSwitch && statusLabelNode) {
        modeToggleSwitch.addEventListener("change", function() {
            if (this.checked) {
                statusLabelNode.innerText = "ACTIVE";
                statusLabelNode.className = "text-emerald-500 font-bold animate-pulse";
            } else {
                statusLabelNode.innerText = "OFF";
                statusLabelNode.className = "text-slate-500 dark:text-gray-500";
            }
        });

        async function attemptQuickPaste(targetElement) {
            if (modeToggleSwitch.checked && targetElement && targetElement.classList.contains("rank-input")) {
                try {
                    const rawClipboardString = await navigator.clipboard.readText();
                    const cleanedIntegerMatch = rawClipboardString.replace(/[^0-9]/g, "").trim();
                    
                    if (cleanedIntegerMatch !== "") {
                        const numericValue = parseInt(cleanedIntegerMatch);
                        if (numericValue >= 0 && numericValue <= 10) {
                            if (targetElement.value != numericValue) {
                                targetElement.value = numericValue;
                                targetElement.classList.add("bg-emerald-50", "border-emerald-500", "dark:bg-emerald-950/40");
                                setTimeout(() => {
                                    targetElement.classList.remove("bg-emerald-50", "border-emerald-500", "dark:bg-emerald-950/40");
                                }, 800);
                            }
                        }
                    }
                } catch (clipboardError) {
                    console.warn("Clipboard access requires user permission or manual Ctrl+V.", clipboardError);
                }
            }
        }

        const inputMatrixNode = document.getElementById("dynamicInputsMatrix");
        if (inputMatrixNode) {
            inputMatrixNode.addEventListener("focusin", function(event) { attemptQuickPaste(event.target); });
        }

        window.addEventListener("focus", function() {
            setTimeout(() => { attemptQuickPaste(document.activeElement); }, 150); 
        });
    }

    if (typeof activeViewMode !== "undefined" && activeViewMode === "config") {
        populateConfigManagerFields();
    }
});