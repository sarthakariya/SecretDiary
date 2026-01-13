/**
 * Secret Diary Classroom - v3.5 (Button Actions & Interactive States)
 */

const STORAGE_KEY = 'classroom_diary_state_v6';

// State
const initialState = {
    diaryLocation: null, // 1-16 or null
    heldBy: 'You',       // 'You', 'Anonymous', or null
    history: [],
    lastKnownLocation: null // Tracks where diary was before Anonymous took it
};

let appState = JSON.parse(localStorage.getItem(STORAGE_KEY)) || initialState;
if (appState.diaryLocation === undefined) appState = initialState;

// Audio Engine (Synthesizer)
const SoundEngine = {
    ctx: null,
    
    init: function() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },

    playTone: function(freq, type, duration, vol = 0.1) {
        if (!this.ctx) this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    playSuccess: function() { 
        // Placing sound
        this.playTone(600, 'sine', 0.1); 
        setTimeout(() => this.playTone(800, 'sine', 0.2), 100);
    },
    
    playTake: function() {
        // Retrieving sound
        this.playTone(400, 'triangle', 0.1); 
        setTimeout(() => this.playTone(500, 'triangle', 0.1), 80);
        setTimeout(() => this.playTone(600, 'triangle', 0.2), 160);
    },

    playClick: function() {
        // Click Empty
        this.playTone(800, 'square', 0.05, 0.03);
    },

    playAlert: function() {
        // Error/Stolen
        this.playTone(150, 'sawtooth', 0.3, 0.1);
        setTimeout(() => this.playTone(100, 'sawtooth', 0.3, 0.1), 150);
    },

    playMagic: function() {
        [400, 500, 600, 800].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'sine', 0.2, 0.05), i * 50);
        });
    }
};

// DOM Elements
const rowLeft = document.getElementById('row-left');
const rowRight = document.getElementById('row-right');
const historyLog = document.getElementById('history-log');
const timeDisplay = document.getElementById('current-time');
const dateDisplay = document.getElementById('current-date');
const inventorySlot = document.getElementById('inventory-slot');
const simulateBtn = document.getElementById('simulate-btn');
const takeBtn = document.getElementById('take-btn');

// Clock
const hourHand = document.querySelector('.hour-hand');
const minuteHand = document.querySelector('.minute-hand');
const secondHand = document.querySelector('.second-hand');

/**
 * Init
 */
function init() {
    renderClassroom();
    renderHistory();
    renderInventory();
    setupEasterEggs();
    
    updateClock();
    setInterval(updateClock, 1000);

    simulateBtn.onclick = handleSimulateActivity;
    takeBtn.onclick = handleTakeButton;
    
    // Init audio on first interaction
    document.body.addEventListener('click', () => SoundEngine.init(), { once: true });
}

/**
 * Renders
 */
function renderClassroom() {
    rowLeft.innerHTML = '';
    rowRight.innerHTML = '';

    for (let i = 1; i <= 16; i++) {
        const isLeftRow = i <= 8;
        const targetContainer = isLeftRow ? rowLeft : rowRight;
        const hasDiary = appState.diaryLocation === i;
        
        // Locking Logic
        // If Anonymous has it, the 'lastKnownLocation' (vacated bench) is locked
        let isLocked = false;
        if (appState.heldBy === 'Anonymous' && appState.lastKnownLocation === i) {
            isLocked = true;
        }

        // Interactive Logic
        // Hover effect if: (User Holds & Bench Empty) OR (User Empty & Bench Has Diary)
        // AND not locked.
        let isInteractive = false;
        if (!isLocked) {
             if (appState.heldBy === 'You') {
                 // I hold it, I can place it anywhere
                 isInteractive = true;
             } else if (appState.heldBy === null && hasDiary) {
                 // Hands empty, diary is here -> Interactive
                 isInteractive = true;
             }
        }
        
        const benchEl = document.createElement('div');
        
        // Base Classes
        let className = `bench w-28 h-16 md:w-36 md:h-20 relative cursor-pointer select-none group`;
        if (isLocked) className += ' locked-bench vacated-anim';
        if (isInteractive) className += ' interactive';

        benchEl.className = className;
        benchEl.onclick = (e) => handleBenchClick(i, e, benchEl);

        // Visual Content
        const diaryContent = hasDiary 
            ? `<div class="absolute inset-0 z-20 flex items-center justify-center diary-icon-anim">
                 <div class="bg-indigo-600 text-white rounded shadow-lg p-2 border-2 border-white">
                    <i class="fa-solid fa-book-journal-whills text-xl"></i>
                 </div>
               </div>`
            : '';

        const deskContent = `
            <div class="bench-surface w-full h-full rounded-lg relative overflow-hidden flex items-center justify-center">
                <span class="absolute top-1 left-2 text-[10px] font-bold text-white/50 shadow-sm">#${i.toString().padStart(2, '0')}</span>
                ${diaryContent}
            </div>
            <!-- Legs (Visual) -->
            <div class="absolute -bottom-1 left-3 w-1.5 h-3 bg-slate-600 rounded-full"></div>
            <div class="absolute -bottom-1 right-3 w-1.5 h-3 bg-slate-600 rounded-full"></div>
        `;

        benchEl.innerHTML = deskContent;
        targetContainer.appendChild(benchEl);
    }
}

function renderInventory() {
    // Button State
    const canTake = appState.diaryLocation !== null && appState.heldBy === null;
    takeBtn.disabled = !canTake;
    takeBtn.className = canTake 
        ? "w-full py-3 rounded-xl font-bold text-white shadow-md transition-all transform active:scale-95 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 border-b-4 border-indigo-800"
        : "w-full py-3 rounded-xl font-bold text-slate-400 shadow-none flex items-center justify-center gap-2 bg-slate-200 border-b-4 border-slate-300 cursor-not-allowed opacity-60";

    // Inventory Slot State
    if (appState.heldBy === 'You') {
        inventorySlot.className = 'w-full h-20 rounded-xl flex items-center justify-center gap-3 shadow-inner border-2 bg-emerald-50 border-emerald-200';
        inventorySlot.innerHTML = `
            <div class="bg-emerald-500 text-white p-2 rounded-full shadow-sm animate-pulse">
                <i class="fa-solid fa-check text-lg"></i>
            </div>
            <div class="text-emerald-800">
                <div class="font-bold text-xs uppercase">In Hand</div>
                <div class="text-[10px]">Click any bench to place</div>
            </div>
        `;
    } else if (appState.heldBy === 'Anonymous') {
        inventorySlot.className = 'w-full h-20 rounded-xl flex items-center justify-center gap-3 shadow-inner border-2 bg-red-50 border-red-200 opacity-70';
        inventorySlot.innerHTML = `
            <div class="bg-red-400 text-white p-2 rounded-full">
                <i class="fa-solid fa-lock text-lg"></i>
            </div>
            <div class="text-red-800">
                <div class="font-bold text-xs uppercase">Unavailable</div>
                <div class="text-[10px]">Taken by Anonymous</div>
            </div>
        `;
    } else {
        // Diary is on a bench
        const benchNum = appState.diaryLocation;
        inventorySlot.className = 'w-full h-20 rounded-xl flex items-center justify-center gap-3 shadow-inner border-2 bg-slate-100 border-slate-200';
        inventorySlot.innerHTML = `
            <div class="bg-slate-300 text-slate-500 p-2 rounded-full">
                <i class="fa-regular fa-hand text-lg"></i>
            </div>
            <div class="text-slate-500">
                <div class="font-bold text-xs uppercase">Empty</div>
                <div class="text-[10px]">Diary at Bench #${benchNum}</div>
            </div>
        `;
    }
}

function renderHistory() {
    if (appState.history.length === 0) {
        historyLog.innerHTML = `
            <div class="flex flex-col items-center justify-center h-40 text-slate-400">
                <i class="fa-regular fa-clock text-3xl mb-2 opacity-30"></i>
                <span class="text-xs font-bold uppercase tracking-widest opacity-50">No Activity</span>
            </div>`;
        return;
    }

    historyLog.innerHTML = '';
    [...appState.history].reverse().forEach((log, idx) => {
        const item = document.createElement('div');
        
        let colorClass = 'border-l-4 border-slate-400 bg-white';
        let icon = 'fa-info-circle';
        
        if (log.action === 'placed') {
            colorClass = 'border-l-4 border-emerald-500 bg-emerald-50/50';
            icon = 'fa-arrow-down';
        } else if (log.action === 'taken') {
            colorClass = 'border-l-4 border-indigo-500 bg-indigo-50/50';
            icon = 'fa-arrow-up';
        }

        const isUser = log.source === 'You';
        const badgeColor = isUser ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700';

        item.className = `log-entry p-2.5 rounded shadow-sm text-sm border border-slate-100 ${colorClass}`;
        item.style.animationDelay = `${idx * 0.05}s`;

        item.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded ${badgeColor}">${log.source}</span>
                <span class="text-[9px] font-mono text-slate-400">${log.time}</span>
            </div>
            <div class="text-slate-700 font-medium pl-1 flex items-center gap-2 text-xs">
                <i class="fa-solid ${icon} text-[10px] opacity-50"></i> ${log.details}
            </div>
        `;
        historyLog.appendChild(item);
    });
}

/**
 * Interactions
 */
function handleBenchClick(benchId, event, element) {
    // If locked by Anonymous, ignore
    if (appState.heldBy === 'Anonymous' && appState.lastKnownLocation === benchId) {
        SoundEngine.playAlert();
        showToast("Locked! Anonymous vacated this spot.", "error");
        return;
    }

    // Visual Feedback
    element.classList.remove('click-confirm');
    void element.offsetWidth; 
    element.classList.add('click-confirm');

    // SCENARIO: You hold diary -> Place it
    if (appState.heldBy === 'You') {
        SoundEngine.playSuccess();
        appState.diaryLocation = benchId;
        appState.heldBy = null;
        addHistory('placed', `Placed on Bench #${benchId}`, 'You');
        saveAndRender();
        showToast(`Diary secured on Bench #${benchId}`, "success");
        return;
    }

    // SCENARIO: Bench has diary, you don't -> Prompt to use Button
    if (appState.diaryLocation === benchId && appState.heldBy === null) {
        SoundEngine.playClick();
        showToast("Use the 'I HAVE TAKEN' button to claim it.", "info");
        // Highlight button
        takeBtn.classList.add('animate-pulse');
        setTimeout(() => takeBtn.classList.remove('animate-pulse'), 1000);
        return;
    }

    // SCENARIO: Empty Bench -> Just noise
    SoundEngine.playClick();
    if (appState.diaryLocation) {
        showToast(`Empty. Diary is at Bench #${appState.diaryLocation}`, "info");
    } else {
        showToast("Bench is empty.", "info");
    }
}

function handleTakeButton() {
    if (appState.diaryLocation !== null && appState.heldBy === null) {
        const fromBench = appState.diaryLocation;
        
        SoundEngine.playTake();
        
        appState.diaryLocation = null;
        appState.heldBy = 'You';
        
        addHistory('taken', `Retrieved from Bench #${fromBench}`, 'You');
        saveAndRender();
        showToast("You have the diary! Click a bench to place.", "success");
    } else {
        SoundEngine.playAlert();
    }
}

function handleSimulateActivity() {
    SoundEngine.playClick(); 

    if (appState.heldBy === 'You') {
        showToast("Simulation skipped: You hold the diary.", "warning");
        return;
    }

    if (appState.heldBy === 'Anonymous') {
        // Anonymous PLACES it
        const randomBench = Math.floor(Math.random() * 16) + 1;
        
        appState.diaryLocation = randomBench;
        appState.heldBy = null;
        appState.lastKnownLocation = null; // Unlock the bench
        
        SoundEngine.playSuccess();
        addHistory('placed', `Returned to Bench #${randomBench}`, 'Anonymous');
        showToast("Anonymous returned the diary.", "info");
    } else if (appState.diaryLocation !== null) {
        // Anonymous TAKES it
        const fromBench = appState.diaryLocation;
        
        appState.diaryLocation = null;
        appState.heldBy = 'Anonymous';
        appState.lastKnownLocation = fromBench; // Lock this bench
        
        SoundEngine.playAlert();
        addHistory('taken', `Stolen from Bench #${fromBench}`, 'Anonymous');
        showToast("Anonymous took the diary!", "error");
    }
    
    saveAndRender();
}

/**
 * Utils
 */
function addHistory(action, details, source) {
    appState.history.push({
        action, details, source,
        time: getTimeData().timeStr
    });
    if(appState.history.length > 50) appState.history.shift();
}

function saveAndRender() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    renderClassroom();
    renderInventory();
    renderHistory();
}

function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    const config = {
        success: { color: 'bg-emerald-600', icon: 'fa-check' },
        error: { color: 'bg-red-600', icon: 'fa-exclamation' },
        warning: { color: 'bg-orange-500', icon: 'fa-bell' },
        info: { color: 'bg-slate-700', icon: 'fa-info' }
    };
    
    const style = config[type];
    
    toast.className = `toast ${style.color} text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 min-w-[300px] pointer-events-auto z-50`;
    toast.innerHTML = `<div class="bg-white/20 p-1 rounded-full"><i class="fa-solid ${style.icon}"></i></div><span class="font-bold text-sm">${msg}</span>`;
    
    document.getElementById('toast-container').appendChild(toast);
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function getTimeData() {
    const now = new Date();
    return {
        timeStr: now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
}

function updateClock() {
    const now = new Date();
    timeDisplay.textContent = now.toLocaleTimeString([], { hour12: false });
    dateDisplay.textContent = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    const s = now.getSeconds();
    const m = now.getMinutes();
    const h = now.getHours();

    secondHand.style.transform = `translateX(-50%) rotate(${s * 6}deg)`;
    minuteHand.style.transform = `translateX(-50%) rotate(${m * 6 + s * 0.1}deg)`;
    hourHand.style.transform = `translateX(-50%) rotate(${h * 30 + m * 0.5}deg)`;
}

function setupEasterEggs() {
    const laptop = document.getElementById('teacher-laptop');
    if(laptop) {
        laptop.onclick = () => {
            SoundEngine.playMagic();
            laptop.classList.add('laptop-hacked');
            showToast("System Hacked: Admin Access Granted", "warning");
            setTimeout(() => laptop.classList.remove('laptop-hacked'), 1500);
        };
    }
    document.getElementById('windows-group').onclick = () => {
        SoundEngine.playClick();
        showToast("It's a beautiful day outside.", "info");
    };
}

document.addEventListener('DOMContentLoaded', init);
