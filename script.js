/**
 * Secret Diary Classroom - v4.0 (Neo-Glass Design)
 */

const STORAGE_KEY = 'classroom_diary_state_v7';

// State
const initialState = {
    diaryLocation: null, 
    heldBy: 'You',       
    history: [],
    lastKnownLocation: null 
};

let appState = JSON.parse(localStorage.getItem(STORAGE_KEY)) || initialState;
if (appState.diaryLocation === undefined) appState = initialState;

// Audio Engine
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
        this.playTone(600, 'sine', 0.1); 
        setTimeout(() => this.playTone(900, 'sine', 0.3), 100);
    },
    playTake: function() {
        this.playTone(400, 'triangle', 0.1); 
        setTimeout(() => this.playTone(600, 'triangle', 0.2), 100);
    },
    playClick: function() {
        this.playTone(800, 'square', 0.03, 0.02);
    },
    playAlert: function() {
        this.playTone(150, 'sawtooth', 0.3, 0.1);
        setTimeout(() => this.playTone(120, 'sawtooth', 0.3, 0.1), 150);
    },
    playMagic: function() {
        [500, 600, 700, 800, 1000].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'sine', 0.15, 0.05), i * 60);
        });
    }
};

// DOM
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
        
        let isLocked = (appState.heldBy === 'Anonymous' && appState.lastKnownLocation === i);

        let isInteractive = false;
        if (!isLocked) {
             if (appState.heldBy === 'You') isInteractive = true;
             else if (appState.heldBy === null && hasDiary) isInteractive = true;
        }
        
        const benchEl = document.createElement('div');
        
        // Base Classes
        let className = `bench w-full aspect-[4/3] relative cursor-pointer select-none group`;
        if (isLocked) className += ' locked-bench vacated-anim';
        if (isInteractive) className += ' interactive';

        benchEl.className = className;
        benchEl.onclick = (e) => handleBenchClick(i, e, benchEl);

        const diaryVisual = hasDiary 
            ? `<div class="absolute inset-0 z-20 flex items-center justify-center diary-icon-anim pointer-events-none">
                 <div class="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-md shadow-lg p-2.5 border border-white/20 transform rotate-[-5deg]">
                    <i class="fa-solid fa-book-journal-whills text-xl"></i>
                 </div>
               </div>`
            : '';

        // Modern Bench Structure
        benchEl.innerHTML = `
            <div class="bench-surface w-full h-full rounded-lg relative flex items-center justify-center">
                <span class="absolute top-2 left-3 text-[10px] font-bold text-slate-400 font-space tracking-widest z-10 opacity-60">
                    #${i.toString().padStart(2, '0')}
                </span>
                ${diaryVisual}
            </div>
        `;

        targetContainer.appendChild(benchEl);
    }
}

function renderInventory() {
    // Button Logic
    const canTake = appState.diaryLocation !== null && appState.heldBy === null;
    takeBtn.disabled = !canTake;
    
    // Inventory Slot Visuals
    if (appState.heldBy === 'You') {
        inventorySlot.className = 'w-full h-24 rounded-2xl flex items-center justify-center gap-4 border border-emerald-200 bg-emerald-50/50 shadow-inner';
        inventorySlot.innerHTML = `
            <div class="bg-gradient-to-br from-emerald-400 to-teal-500 text-white p-3 rounded-full shadow-lg shadow-emerald-500/20">
                <i class="fa-solid fa-check text-xl"></i>
            </div>
            <div>
                <div class="text-emerald-800 font-bold text-sm uppercase tracking-wide">Secure</div>
                <div class="text-[10px] text-emerald-600 font-medium bg-emerald-100 px-2 py-0.5 rounded-full inline-block mt-1">Ready to Place</div>
            </div>
        `;
    } else if (appState.heldBy === 'Anonymous') {
        inventorySlot.className = 'w-full h-24 rounded-2xl flex items-center justify-center gap-4 border border-rose-200 bg-rose-50/50 shadow-inner';
        inventorySlot.innerHTML = `
            <div class="bg-gradient-to-br from-rose-500 to-red-600 text-white p-3 rounded-full shadow-lg shadow-rose-500/20">
                <i class="fa-solid fa-user-secret text-xl"></i>
            </div>
            <div>
                <div class="text-rose-800 font-bold text-sm uppercase tracking-wide">Breach</div>
                <div class="text-[10px] text-rose-600 font-medium">Wait for Return</div>
            </div>
        `;
    } else {
        const benchNum = appState.diaryLocation;
        inventorySlot.className = 'w-full h-24 rounded-2xl flex items-center justify-center gap-4 border border-slate-200 bg-white/50 shadow-inner';
        inventorySlot.innerHTML = `
            <div class="bg-slate-200 text-slate-400 p-3 rounded-full">
                <i class="fa-regular fa-hand text-xl"></i>
            </div>
            <div class="flex flex-col">
                <div class="text-slate-500 font-bold text-sm uppercase tracking-wide">Empty</div>
                <div class="text-[10px] text-slate-400 font-medium">
                    Target: <span class="font-bold text-indigo-500">Bench #${benchNum}</span>
                </div>
            </div>
        `;
    }
}

function renderHistory() {
    if (appState.history.length === 0) {
        historyLog.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-slate-400/50">
                <i class="fa-solid fa-wave-square text-3xl mb-2"></i>
                <span class="text-[10px] font-bold uppercase tracking-widest">System Idle</span>
            </div>`;
        return;
    }

    historyLog.innerHTML = '';
    [...appState.history].reverse().forEach((log, idx) => {
        const item = document.createElement('div');
        
        let accent = 'bg-slate-500';
        let icon = 'fa-info';
        let bg = 'bg-white';
        
        if (log.action === 'placed') {
            accent = 'bg-emerald-500';
            icon = 'fa-arrow-down';
            bg = 'bg-emerald-50/50 border-emerald-100';
        } else if (log.action === 'taken') {
            accent = 'bg-indigo-500';
            icon = 'fa-arrow-up';
            bg = 'bg-indigo-50/50 border-indigo-100';
        }

        item.className = `log-entry p-3 rounded-xl border shadow-sm text-sm ${bg} relative overflow-hidden group`;
        item.style.animationDelay = `${idx * 0.05}s`;

        item.innerHTML = `
            <div class="absolute left-0 top-0 bottom-0 w-1 ${accent}"></div>
            <div class="flex justify-between items-start mb-1 pl-2">
                <span class="text-[9px] font-black uppercase tracking-wider text-slate-400">${log.time}</span>
                <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-100 shadow-sm text-slate-600">${log.source}</span>
            </div>
            <div class="pl-2 flex items-center gap-2 text-xs font-medium text-slate-700">
                <div class="w-4 h-4 rounded-full ${accent} text-white flex items-center justify-center text-[8px]">
                    <i class="fa-solid ${icon}"></i>
                </div>
                ${log.details}
            </div>
        `;
        historyLog.appendChild(item);
    });
}

/**
 * Interactions
 */
function handleBenchClick(benchId, event, element) {
    if (appState.heldBy === 'Anonymous' && appState.lastKnownLocation === benchId) {
        SoundEngine.playAlert();
        showToast("Access Denied: Sector Locked", "error");
        return;
    }

    if (appState.heldBy === 'You') {
        SoundEngine.playSuccess();
        appState.diaryLocation = benchId;
        appState.heldBy = null;
        addHistory('placed', `Secured at Bench #${benchId}`, 'You');
        saveAndRender();
        showToast(`Diary placed successfully.`, "success");
        return;
    }

    if (appState.diaryLocation === benchId && appState.heldBy === null) {
        SoundEngine.playClick();
        showToast("Press 'CLAIM DIARY' to retrieve.", "info");
        takeBtn.classList.add('animate-pulse');
        setTimeout(() => takeBtn.classList.remove('animate-pulse'), 800);
        return;
    }

    SoundEngine.playClick();
    if (appState.diaryLocation) {
        showToast(`Sector Empty. Target is at #${appState.diaryLocation}`, "info");
    } else {
        showToast("Sector Empty.", "info");
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
        showToast("Diary Retrieved. Authorization Granted.", "success");
    } else {
        SoundEngine.playAlert();
    }
}

function handleSimulateActivity() {
    SoundEngine.playClick(); 

    if (appState.heldBy === 'You') {
        showToast("Simulation Blocked: User Control Active.", "warning");
        return;
    }

    if (appState.heldBy === 'Anonymous') {
        const randomBench = Math.floor(Math.random() * 16) + 1;
        appState.diaryLocation = randomBench;
        appState.heldBy = null;
        appState.lastKnownLocation = null;
        
        SoundEngine.playSuccess();
        addHistory('placed', `Returned to Bench #${randomBench}`, 'Anonymous');
        showToast("Signal Detected: Diary Returned.", "info");
    } else if (appState.diaryLocation !== null) {
        const fromBench = appState.diaryLocation;
        appState.diaryLocation = null;
        appState.heldBy = 'Anonymous';
        appState.lastKnownLocation = fromBench;
        
        SoundEngine.playAlert();
        addHistory('taken', `Extracted from Bench #${fromBench}`, 'Anonymous');
        showToast("Security Breach: Diary Taken!", "error");
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
    const colors = {
        success: 'bg-emerald-600/90 border-emerald-400',
        error: 'bg-rose-600/90 border-rose-400',
        warning: 'bg-amber-500/90 border-amber-400',
        info: 'bg-slate-700/90 border-slate-500'
    };
    
    toast.className = `toast ${colors[type]} backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[320px] pointer-events-auto border-l-4 font-inter z-50`;
    toast.innerHTML = `<i class="fa-solid fa-circle-info opacity-80"></i><span class="font-medium text-sm">${msg}</span>`;
    
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
            laptop.parentElement.classList.add('laptop-hacked');
            showToast("System Override: Admin Access Granted", "warning");
            setTimeout(() => laptop.parentElement.classList.remove('laptop-hacked'), 1500);
        };
    }
}

document.addEventListener('DOMContentLoaded', init);
