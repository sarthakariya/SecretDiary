/**
 * State Management
 * We use a simple state object to track the benches and history.
 * In a real app, this would sync with a backend. Here we use localStorage.
 */
const STORAGE_KEY = 'classroom_diary_state_v2';

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

// Ensure structure integrity in case of old saves or updates
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
const simulateBtn = document.getElementById('simulate-btn');

/**
 * Render Functions
 */
function init() {
    renderBenches();
    renderHistory();
    updateClock();
    setInterval(updateClock, 1000);
    
    // Bind simulation button
    simulateBtn.onclick = handleSimulateActivity;
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
        
        // Base classes
        let borderClass = 'border-emerald-500';
        let bgClass = 'bg-slate-700/50';
        let textClass = 'text-slate-300';
        let icon = '<i class="fa-solid fa-user-secret"></i>';
        
        // Logic for different states
        if (log.action === 'removed') {
            borderClass = 'border-rose-500';
            bgClass = 'bg-slate-700/30';
            textClass = 'text-slate-400';
            icon = '<i class="fa-solid fa-person-walking-arrow-right"></i>';
        }

        // Distinct look for anonymous/simulated actions
        const isAnonymous = log.source === 'Anonymous';
        const userLabel = isAnonymous ? 'Someone' : 'You';
        
        logItem.className = `${bgClass} p-3 rounded-md border-l-4 ${borderClass} text-xs ${textClass} animate-fade-in`;

        logItem.innerHTML = `
            <div class="flex justify-between mb-1">
                <span class="font-bold ${log.action === 'placed' ? 'text-emerald-400' : 'text-rose-400'}">
                    ${log.action === 'placed' ? 'Diary Kept' : 'Diary Taken'}
                </span>
                <span class="text-slate-500 font-mono">${log.time}</span>
            </div>
            <div class="flex justify-between items-end">
                <div>
                    Bench <span class="font-bold text-white">#${log.benchId}</span>
                    <span class="block text-[10px] text-slate-500 mt-1">${log.date}</span>
                </div>
                <div class="text-[10px] uppercase font-bold tracking-wider opacity-60">
                    ${icon} ${userLabel}
                </div>
            </div>
        `;
        historyLog.appendChild(logItem);
    });
}

/**
 * Logic
 */

// Helper to get formatted time
function getTimeData() {
    const now = new Date();
    return {
        timeStr: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        dateStr: now.toLocaleDateString(),
        timestamp: Date.now()
    };
}

// User Action
function handleBenchClick(benchId) {
    const benchIndex = appState.benches.findIndex(b => b.id === benchId);
    if (benchIndex === -1) return;

    const bench = appState.benches[benchIndex];
    const { timeStr, dateStr, timestamp } = getTimeData();

    const newHasDiary = !bench.hasDiary;
    
    // Update Bench State
    appState.benches[benchIndex] = {
        ...bench,
        hasDiary: newHasDiary,
        lastUpdated: new Date().toISOString()
    };

    // Add to History
    const logEntry = {
        id: timestamp,
        benchId: benchId,
        action: newHasDiary ? 'placed' : 'removed',
        source: 'You',
        time: timeStr,
        date: dateStr
    };
    appState.history.push(logEntry);

    // Save & Render
    saveState();
    renderBenches();
    renderHistory();

    // Feedback
    if (newHasDiary) {
        showToast(`You securely kept a diary on Bench ${benchId}`, 'success');
    } else {
        showToast(`You retrieved the diary from Bench ${benchId}`, 'info');
    }
}

// Simulation Action
function handleSimulateActivity() {
    const { timeStr, dateStr, timestamp } = getTimeData();
    
    // Decide whether to PLACE or TAKE
    // If there are diaries, 50% chance to take one.
    // If no diaries, must place.
    const benchesWithDiary = appState.benches.filter(b => b.hasDiary);
    const benchesEmpty = appState.benches.filter(b => !b.hasDiary);
    
    let actionType = 'none'; // 'placed' or 'removed'
    let targetBench = null;

    if (benchesWithDiary.length > 0 && Math.random() > 0.4) {
        // ACTION: Someone takes a diary
        actionType = 'removed';
        const randomIndex = Math.floor(Math.random() * benchesWithDiary.length);
        targetBench = benchesWithDiary[randomIndex];
    } else if (benchesEmpty.length > 0) {
        // ACTION: Someone places a diary
        actionType = 'placed';
        const randomIndex = Math.floor(Math.random() * benchesEmpty.length);
        targetBench = benchesEmpty[randomIndex];
    } else {
        // No empty benches to place, and random chance didn't pick remove
        // Force remove if full
        if (benchesWithDiary.length > 0) {
            actionType = 'removed';
            targetBench = benchesWithDiary[0];
        } else {
            showToast('Classroom is quiet. Nothing happened.', 'info');
            return;
        }
    }

    // Perform Update
    const benchIndex = appState.benches.findIndex(b => b.id === targetBench.id);
    const newHasDiary = actionType === 'placed';

    appState.benches[benchIndex] = {
        ...targetBench,
        hasDiary: newHasDiary,
        lastUpdated: new Date().toISOString()
    };

    // Log
    const logEntry = {
        id: timestamp,
        benchId: targetBench.id,
        action: actionType,
        source: 'Anonymous',
        time: timeStr,
        date: dateStr
    };
    appState.history.push(logEntry);

    saveState();
    renderBenches();
    renderHistory();

    // Specific Toast Message for Simulation
    if (actionType === 'placed') {
        showToast(`Someone secretly hid a diary on Bench ${targetBench.id}`, 'warning');
    } else {
        showToast(`Diary on Bench ${targetBench.id} was taken by someone!`, 'error');
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
    
    let bgClass = 'bg-slate-600';
    let icon = '<i class="fa-solid fa-info-circle mr-2"></i>';

    if (type === 'success') {
        bgClass = 'bg-emerald-600';
        icon = '<i class="fa-solid fa-check mr-2"></i>';
    } else if (type === 'error') {
        bgClass = 'bg-rose-600';
        icon = '<i class="fa-solid fa-user-secret mr-2"></i>';
    } else if (type === 'warning') {
        bgClass = 'bg-amber-600';
        icon = '<i class="fa-solid fa-eye mr-2"></i>';
    }
    
    toast.className = `toast ${bgClass} text-white px-4 py-3 rounded shadow-lg flex items-center min-w-[200px] pointer-events-auto border-l-4 border-white/20`;
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
