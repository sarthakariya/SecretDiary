/**
 * Secret Diary Classroom - Core Logic v2.0
 * Features: Singleton Diary, History Tracking, Simulation, Time Sync
 */

const STORAGE_KEY = 'classroom_diary_state_v3';

// Singleton State Structure
const initialState = {
    // 0 = Not on bench (held by someone), 1-16 = On specific bench
    diaryLocation: null, 
    // 'You' | 'Anonymous' | null (if on bench)
    heldBy: 'You', 
    // Timestamp of last take to enforce "One take per day" soft limit (optional, visual only)
    lastTakeTime: null,
    history: []
};

let appState = JSON.parse(localStorage.getItem(STORAGE_KEY)) || initialState;

// Migration/Reset Check
if (appState.diaryLocation === undefined) {
    appState = initialState;
}

// DOM Elements
const rowLeft = document.getElementById('row-left');
const rowRight = document.getElementById('row-right');
const historyLog = document.getElementById('history-log');
const timeDisplay = document.getElementById('current-time');
const dateDisplay = document.getElementById('current-date');
const inventorySlot = document.getElementById('inventory-slot');
const simulateBtn = document.getElementById('simulate-btn');

// Clock Elements
const hourHand = document.querySelector('.hour-hand');
const minuteHand = document.querySelector('.minute-hand');
const secondHand = document.querySelector('.second-hand');

// Sound Effects (Simulated via simple objects, in real app use Audio)
const Sounds = {
    place: () => {}, // Placeholder
    take: () => {},  // Placeholder
};

/**
 * Initialization
 */
function init() {
    renderClassroom();
    renderHistory();
    renderInventory();
    
    // Start Clock Tick
    updateClock();
    setInterval(updateClock, 1000);

    // Bind Simulation
    simulateBtn.onclick = handleSimulateActivity;
}

/**
 * Rendering
 */
function renderClassroom() {
    rowLeft.innerHTML = '';
    rowRight.innerHTML = '';

    // Generate 16 benches
    for (let i = 1; i <= 16; i++) {
        const isLeftRow = i <= 8;
        const targetContainer = isLeftRow ? rowLeft : rowRight;
        const hasDiary = appState.diaryLocation === i;

        const benchEl = document.createElement('div');
        benchEl.className = 'bench w-24 h-16 md:w-32 md:h-20 relative cursor-pointer group';
        benchEl.onclick = (e) => handleBenchClick(i, e);

        // Visual State Classes
        const diaryVisual = hasDiary 
            ? `<div class="absolute inset-0 flex items-center justify-center z-10 diary-glow transition-all duration-500">
                 <div class="bg-emerald-500 text-slate-900 rounded shadow-lg p-1.5 transform group-hover:scale-110 transition-transform">
                    <i class="fa-solid fa-book-journal-whills text-xl"></i>
                 </div>
               </div>`
            : '';

        const activeBorder = hasDiary ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-white/10 group-hover:border-cyan-400/30';

        benchEl.innerHTML = `
            <div class="bench-surface w-full h-full rounded-lg border ${activeBorder} flex items-center justify-center relative overflow-hidden">
                <div class="absolute top-1 left-2 text-[10px] font-mono font-bold text-white/30 bench-label">#${i.toString().padStart(2, '0')}</div>
                ${diaryVisual}
                <div class="ripple-container absolute inset-0 overflow-hidden rounded-lg pointer-events-none"></div>
            </div>
        `;

        targetContainer.appendChild(benchEl);
    }
}

function renderInventory() {
    // Show what the user is holding
    if (appState.heldBy === 'You') {
        inventorySlot.className = 'w-full h-16 bg-emerald-900/20 rounded-lg border border-emerald-500/50 flex items-center justify-center gap-3 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]';
        inventorySlot.innerHTML = `
            <i class="fa-solid fa-book-journal-whills text-emerald-400 text-2xl animate-pulse"></i>
            <div>
                <div class="text-emerald-400 font-bold text-sm uppercase">Secret Diary</div>
                <div class="text-[10px] text-emerald-600">Click a bench to hide it</div>
            </div>
        `;
    } else if (appState.heldBy === 'Anonymous') {
        inventorySlot.className = 'w-full h-16 bg-slate-900 rounded-lg border border-rose-500/30 flex items-center justify-center gap-3 opacity-50 grayscale';
        inventorySlot.innerHTML = `
            <i class="fa-solid fa-user-secret text-rose-400 text-xl"></i>
            <div>
                <div class="text-rose-400 font-bold text-xs uppercase">Taken by Someone</div>
                <div class="text-[10px] text-rose-600">Wait for them to return it</div>
            </div>
        `;
    } else {
        // Diary is on a bench
        const benchNum = appState.diaryLocation;
        inventorySlot.className = 'w-full h-16 bg-slate-950 rounded-lg border border-slate-700 flex items-center justify-center gap-3';
        inventorySlot.innerHTML = `
            <span class="text-slate-600 italic text-sm">You are empty handed</span>
            <div class="text-[10px] text-slate-700">Find the diary on Bench #${benchNum}</div>
        `;
    }
}

function renderHistory() {
    if (appState.history.length === 0) {
        historyLog.innerHTML = `
            <div class="flex flex-col items-center justify-center h-48 text-slate-600">
                <i class="fa-regular fa-clock text-4xl mb-3 opacity-20"></i>
                <span class="text-xs italic">System Log Empty</span>
            </div>`;
        return;
    }

    historyLog.innerHTML = '';
    // Reverse copy
    [...appState.history].reverse().forEach((log, idx) => {
        const logItem = document.createElement('div');
        
        // Dynamic Styling based on Action
        let accentColor = 'border-slate-600';
        let icon = 'fa-circle-info';
        let bg = 'bg-slate-800/40';
        
        if (log.action === 'placed') {
            accentColor = 'border-emerald-500';
            icon = 'fa-file-arrow-down';
            bg = 'bg-emerald-900/10';
        } else if (log.action === 'taken') {
            accentColor = 'border-rose-500';
            icon = 'fa-hand-holding-hand';
            bg = 'bg-rose-900/10';
        }

        const isUser = log.source === 'You';
        const sourceColor = isUser ? 'text-cyan-400' : 'text-amber-500';
        const sourceLabel = isUser ? 'YOU' : 'ANON';

        logItem.className = `log-entry-enter relative p-3 rounded border-l-2 ${accentColor} ${bg} hover:bg-white/5 transition-colors`;
        // Stagger animation
        logItem.style.animationDelay = `${idx * 50}ms`;

        logItem.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-[10px] font-bold ${sourceColor} bg-black/30 px-1.5 rounded">${sourceLabel}</span>
                    <span class="text-xs font-semibold text-slate-300 uppercase">${log.action}</span>
                </div>
                <span class="text-[10px] font-mono text-slate-500">${log.time}</span>
            </div>
            <div class="text-xs text-slate-400 pl-1">
                ${log.details}
            </div>
        `;
        historyLog.appendChild(logItem);
    });
}

/**
 * Interactions
 */
function handleBenchClick(benchId, event) {
    createRipple(event);

    const { timeStr, timestamp } = getTimeData();
    let action = null;
    let message = '';
    let type = 'info';

    // SCENARIO 1: You have the diary, place it on empty bench
    if (appState.heldBy === 'You') {
        if (appState.diaryLocation === null) {
            // Place it
            appState.diaryLocation = benchId;
            appState.heldBy = null;
            
            action = 'placed';
            message = `Diary hidden securely on Bench #${benchId}`;
            type = 'success';
        } else {
            // Should not happen if logic is correct (heldBy null if location set)
            // But if we allow moving it directly... let's stick to simple "Place" logic
        }
    } 
    // SCENARIO 2: Diary is on THIS bench, take it
    else if (appState.diaryLocation === benchId) {
        if (appState.heldBy === null) {
            // Take it
            appState.diaryLocation = null;
            appState.heldBy = 'You';
            appState.lastTakeTime = timestamp;

            action = 'taken';
            message = `You retrieved the diary from Bench #${benchId}`;
            type = 'success';
        }
    }
    // SCENARIO 3: Diary is on ANOTHER bench
    else if (appState.diaryLocation !== null && appState.diaryLocation !== benchId) {
        showToast(`Empty. The diary is at Bench #${appState.diaryLocation}`, 'error');
        return; 
    }
    // SCENARIO 4: Someone else has it
    else if (appState.heldBy === 'Anonymous') {
        showToast('Someone else has the diary. You must wait.', 'warning');
        return;
    }
    // SCENARIO 5: Empty bench, no one has it (Should not happen in singleton logic unless bug)
    else {
        showToast('This bench is empty.', 'info');
        return;
    }

    // Commit Action
    if (action) {
        addHistory(action, message, 'You');
        saveState();
        renderAll();
        showToast(message, type);
    }
}

function handleSimulateActivity() {
    // Simulation Rules:
    // 1. If 'You' hold it, Anonymous cannot take it (Too frustrating for user).
    // 2. If it's on a bench, Anonymous can take it.
    // 3. If Anonymous holds it, they place it on a random bench.

    if (appState.heldBy === 'You') {
        showToast("You are holding the diary. Keep it safe!", 'info');
        return;
    }

    const { timeStr } = getTimeData();
    let action = null;
    let message = '';

    if (appState.heldBy === 'Anonymous') {
        // Anonymous Places it
        const randomBench = Math.floor(Math.random() * 16) + 1;
        appState.diaryLocation = randomBench;
        appState.heldBy = null;

        action = 'placed';
        message = `Someone returned the diary to Bench #${randomBench}`;
        showToast("Activity Detected: Diary returned to class.", 'warning');
    } 
    else if (appState.diaryLocation !== null) {
        // Anonymous Takes it
        const fromBench = appState.diaryLocation;
        appState.diaryLocation = null;
        appState.heldBy = 'Anonymous';

        action = 'taken';
        message = `Someone snatched the diary from Bench #${fromBench}`;
        showToast("Alert! The diary was taken by someone.", 'error');
    }

    if (action) {
        addHistory(action, message, 'Anonymous');
        saveState();
        renderAll();
    }
}

/**
 * Helpers
 */
function addHistory(action, details, source) {
    const { timeStr } = getTimeData();
    appState.history.push({
        id: Date.now(),
        action,
        details,
        source,
        time: timeStr
    });
    // Limit history size
    if (appState.history.length > 50) appState.history.shift();
}

function getTimeData() {
    const now = new Date();
    return {
        timeStr: now.toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    };
}

function updateClock() {
    const now = new Date();
    
    // Digital
    timeDisplay.textContent = now.toLocaleTimeString([], { hour12: false });
    dateDisplay.textContent = now.toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

    // Analog
    const seconds = now.getSeconds();
    const minutes = now.getMinutes();
    const hours = now.getHours();

    const secondsDegrees = ((seconds / 60) * 360);
    const minutesDegrees = ((minutes / 60) * 360) + ((seconds/60)*6);
    const hoursDegrees = ((hours / 12) * 360) + ((minutes/60)*30);

    secondHand.style.transform = `translateX(-50%) rotate(${secondsDegrees}deg)`;
    minuteHand.style.transform = `translateX(-50%) rotate(${minutesDegrees}deg)`;
    hourHand.style.transform = `translateX(-50%) rotate(${hoursDegrees}deg)`;
}

function createRipple(event) {
    const button = event.currentTarget;
    const ripple = document.createElement("span");
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.className = "ripple";
    
    // Append to a specific container if needed, or the button itself
    const container = button.querySelector('.ripple-container');
    if (container) {
        container.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function renderAll() {
    renderClassroom();
    renderInventory();
    renderHistory();
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const colors = {
        success: 'bg-emerald-600/90 border-emerald-400',
        error: 'bg-rose-600/90 border-rose-400',
        warning: 'bg-amber-600/90 border-amber-400',
        info: 'bg-slate-700/90 border-slate-500'
    };
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-triangle-exclamation',
        warning: 'fa-bell',
        info: 'fa-circle-info'
    };

    toast.className = `toast backdrop-blur-md text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 border-l-4 ${colors[type]} pointer-events-auto min-w-[280px]`;
    
    toast.innerHTML = `
        <i class="fa-solid ${icons[type]} text-lg"></i>
        <div class="flex-1">
            <div class="text-xs font-bold uppercase opacity-80">${type}</div>
            <div class="text-sm font-medium leading-tight">${message}</div>
        </div>
    `;
    
    const container = document.getElementById('toast-container');
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Init
document.addEventListener('DOMContentLoaded', init);
