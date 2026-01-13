/**
 * State Management
 * We use a simple state object to track the benches and history.
 * In a real app, this would sync with a backend. Here we use localStorage.
 */
const STORAGE_KEY = 'classroom_diary_state_v1';

const initialState = {
    // 16 benches: ID 1-8 (Left Row), ID 9-16 (Right Row)
    benches: Array.from({ length: 16 }, (_, i) => ({
        id: i + 1,
        hasDiary: false,
        lastUpdated: null
    })),
    history: []
};

// Load state from local storage or use initial state
let appState = JSON.parse(localStorage.getItem(STORAGE_KEY)) || initialState;

// Ensure structure integrity in case of old saves
if (!appState.benches || appState.benches.length !== 16) {
    appState = initialState;
}

// DOM Elements
const rowLeft = document.getElementById('row-left');
const rowRight = document.getElementById('row-right');
const historyLog = document.getElementById('history-log');
const timeDisplay = document.getElementById('current-time');
const dateDisplay = document.getElementById('current-date');
const toastContainer = document.getElementById('toast-container');

/**
 * Render Functions
 */
function init() {
    renderBenches();
    renderHistory();
    updateClock();
    setInterval(updateClock, 1000);
}

function renderBenches() {
    rowLeft.innerHTML = '';
    rowRight.innerHTML = '';

    appState.benches.forEach((bench, index) => {
        const isLeftRow = index < 8; // First 8 on left
        const targetContainer = isLeftRow ? rowLeft : rowRight;

        const benchEl = document.createElement('div');
        benchEl.className = `bench relative w-32 h-16 rounded-lg shadow-md cursor-pointer select-none transition-all duration-200 border-2
            ${bench.hasDiary 
                ? 'bg-emerald-900/40 border-emerald-500 status-active' 
                : 'wood-texture border-amber-900/50 hover:border-amber-500'}`;
        
        benchEl.onclick = () => handleBenchClick(bench.id);

        // Bench Content
        benchEl.innerHTML = `
            <div class="absolute top-1 left-2 text-[10px] font-bold text-white/30">
                #${bench.id.toString().padStart(2, '0')}
            </div>
            <div class="w-full h-full flex items-center justify-center">
                ${bench.hasDiary 
                    ? `<div class="diary-icon text-emerald-400 text-2xl drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]">
                         <i class="fa-solid fa-circle-check"></i>
                       </div>` 
                    : `<div class="text-amber-900/40 text-sm font-semibold">Empty</div>`
                }
            </div>
            <!-- Desk details -->
            <div class="absolute bottom-0 w-full h-1 bg-black/20"></div>
        `;

        targetContainer.appendChild(benchEl);
    });
}

function renderHistory() {
    if (appState.history.length === 0) {
        historyLog.innerHTML = '<div class="text-center text-slate-500 text-sm italic mt-10">No secret diaries placed yet...</div>';
        return;
    }

    historyLog.innerHTML = '';
    // Show newest first
    [...appState.history].reverse().forEach(log => {
        const logItem = document.createElement('div');
        logItem.className = 'bg-slate-700/50 p-3 rounded-md border-l-4 border-emerald-500 text-xs text-slate-300 animate-fade-in';
        
        // Different styling for remove vs add
        if (log.action === 'removed') {
            logItem.className = 'bg-slate-700/30 p-3 rounded-md border-l-4 border-rose-500 text-xs text-slate-400';
        }

        logItem.innerHTML = `
            <div class="flex justify-between mb-1">
                <span class="font-bold ${log.action === 'placed' ? 'text-emerald-400' : 'text-rose-400'}">
                    ${log.action === 'placed' ? 'Secret Kept' : 'Secret Taken'}
                </span>
                <span class="text-slate-500 font-mono">${log.time}</span>
            </div>
            <div>
                Bench <span class="font-bold text-white">#${log.benchId}</span>
                <span class="block text-[10px] text-slate-500 mt-1">${log.date}</span>
            </div>
        `;
        historyLog.appendChild(logItem);
    });
}

/**
 * Logic
 */
function handleBenchClick(benchId) {
    const benchIndex = appState.benches.findIndex(b => b.id === benchId);
    if (benchIndex === -1) return;

    const bench = appState.benches[benchIndex];
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString();

    const newHasDiary = !bench.hasDiary;

    // Update Bench State
    appState.benches[benchIndex] = {
        ...bench,
        hasDiary: newHasDiary,
        lastUpdated: new Date().toISOString()
    };

    // Add to History
    const logEntry = {
        id: Date.now(),
        benchId: benchId,
        action: newHasDiary ? 'placed' : 'removed',
        time: timeStr,
        date: dateStr
    };
    appState.history.push(logEntry);

    // Save
    saveState();

    // Re-render
    renderBenches();
    renderHistory();

    // Feedback
    if (newHasDiary) {
        showToast(`Diary kept securely on Bench ${benchId}`, 'success');
    } else {
        showToast(`Diary retrieved from Bench ${benchId}`, 'info');
    }
}

function updateClock() {
    const now = new Date();
    timeDisplay.textContent = now.toLocaleTimeString();
    dateDisplay.textContent = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

/**
 * Utilities
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-emerald-600' : 'bg-slate-600';
    const icon = type === 'success' ? '<i class="fa-solid fa-check mr-2"></i>' : '<i class="fa-solid fa-info-circle mr-2"></i>';
    
    toast.className = `toast ${bgClass} text-white px-4 py-3 rounded shadow-lg flex items-center min-w-[200px] pointer-events-auto`;
    toast.innerHTML = `${icon} <span class="font-medium text-sm">${message}</span>`;
    
    toastContainer.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}

// Initialize App
document.addEventListener('DOMContentLoaded', init);
