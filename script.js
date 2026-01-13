/**
 * Secret Diary Classroom - v3.0 (Light Theme & Sound Engine)
 */

const STORAGE_KEY = 'classroom_diary_state_v5';

// State
const initialState = {
    diaryLocation: null, // 1-16 or null
    heldBy: 'You',       // 'You', 'Anonymous', or null
    history: []
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
        this.playTone(600, 'sine', 0.1); 
        setTimeout(() => this.playTone(800, 'sine', 0.2), 100);
    },
    
    playTake: function() {
        this.playTone(400, 'triangle', 0.1); 
        setTimeout(() => this.playTone(300, 'triangle', 0.2), 100);
    },

    playClick: function() {
        this.playTone(800, 'square', 0.05, 0.05);
    },

    playAlert: function() {
        this.playTone(200, 'sawtooth', 0.3, 0.1);
        setTimeout(() => this.playTone(150, 'sawtooth', 0.3, 0.1), 150);
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

// Clock
const hourHand = document.querySelector('.hour-hand');
const minuteHand = document.querySelector('.minute-hand');
const secondHand = document.querySelector('.second-hand');

// Transient Visual State
let recentlyVacatedBench = null;

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
        const isLocked = appState.heldBy === 'Anonymous';

        const benchEl = document.createElement('div');
        
        // Base Classes
        let className = `bench w-28 h-16 md:w-36 md:h-20 relative cursor-pointer select-none group`;
        if (isLocked) className += ' locked-bench';
        if (recentlyVacatedBench === i) className += ' vacated-anim'; // Add transient class

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
            <div class="bench-surface w-full h-full rounded-lg border-2 border-slate-300 relative overflow-hidden flex items-center justify-center bg-white">
                <span class="absolute top-1 left-2 text-[10px] font-bold text-slate-400/50">#${i.toString().padStart(2, '0')}</span>
                ${diaryContent}
            </div>
            <!-- Legs (Visual) -->
            <div class="absolute -bottom-1 left-2 w-1 h-2 bg-slate-400 rounded-full"></div>
            <div class="absolute -bottom-1 right-2 w-1 h-2 bg-slate-400 rounded-full"></div>
        `;

        benchEl.innerHTML = deskContent;
        targetContainer.appendChild(benchEl);
    }
}

function renderInventory() {
    if (appState.heldBy === 'You') {
        inventorySlot.className = 'w-full h-24 bg-indigo-50 border-2 border-indigo-200 rounded-xl flex items-center justify-center gap-4 cursor-pointer hover:bg-indigo-100 shadow-sm transition-colors group';
        inventorySlot.onclick = () => {
            SoundEngine.playClick();
            showToast("Select a bench to place the diary!", "info");
        };
        inventorySlot.innerHTML = `
            <div class="bg-indigo-600 text-white p-3 rounded-full shadow-md group-hover:scale-110 transition-transform">
                <i class="fa-solid fa-hand-holding-heart text-xl"></i>
            </div>
            <div>
                <div class="text-indigo-800 font-bold text-sm uppercase">You have it</div>
                <div class="text-[10px] text-indigo-500 font-bold bg-white px-2 py-0.5 rounded-full inline-block shadow-sm">PLACE IT</div>
            </div>
        `;
    } else if (appState.heldBy === 'Anonymous') {
        inventorySlot.className = 'w-full h-24 bg-red-50 border-2 border-red-100 rounded-xl flex items-center justify-center gap-4 cursor-not-allowed grayscale opacity-80';
        inventorySlot.onclick = () => SoundEngine.playAlert();
        inventorySlot.innerHTML = `
            <div class="bg-red-500 text-white p-3 rounded-full shadow-md">
                <i class="fa-solid fa-mask text-xl"></i>
            </div>
            <div>
                <div class="text-red-800 font-bold text-sm uppercase">STOLEN!</div>
                <div class="text-[10px] text-red-500 font-bold">WAIT FOR RETURN</div>
            </div>
        `;
    } else {
        const benchNum = appState.diaryLocation;
        inventorySlot.className = 'w-full h-24 bg-white border-2 border-slate-100 rounded-xl flex items-center justify-center gap-4 cursor-default';
        inventorySlot.onclick = null;
        inventorySlot.innerHTML = `
            <div class="bg-slate-200 text-slate-400 p-3 rounded-full">
                <i class="fa-regular fa-hand text-xl"></i>
            </div>
            <div>
                <div class="text-slate-500 font-bold text-sm uppercase">Empty Hands</div>
                <div class="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-200">Look at Bench #${benchNum}</div>
            </div>
        `;
    }
}

function renderHistory() {
    if (appState.history.length === 0) {
        historyLog.innerHTML = `
            <div class="flex flex-col items-center justify-center h-40 text-slate-400">
                <i class="fa-regular fa-note-sticky text-3xl mb-2 opacity-30"></i>
                <span class="text-xs font-bold uppercase tracking-widest opacity-50">Log Empty</span>
            </div>`;
        return;
    }

    historyLog.innerHTML = '';
    [...appState.history].reverse().forEach((log, idx) => {
        const item = document.createElement('div');
        
        let colorClass = 'border-l-4 border-slate-400 bg-white';
        let icon = 'fa-info-circle';
        
        if (log.action === 'placed') {
            colorClass = 'border-l-4 border-green-500 bg-green-50/50';
            icon = 'fa-download';
        } else if (log.action === 'taken') {
            colorClass = 'border-l-4 border-red-500 bg-red-50/50';
            icon = 'fa-upload';
        }

        const isUser = log.source === 'You';
        const badgeColor = isUser ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700';

        item.className = `log-entry p-3 rounded shadow-sm text-sm border border-slate-100 ${colorClass}`;
        item.style.animationDelay = `${idx * 0.05}s`;

        item.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${badgeColor}">${log.source}</span>
                <span class="text-[10px] font-mono text-slate-400">${log.time}</span>
            </div>
            <div class="text-slate-700 font-medium pl-1 flex items-center gap-2">
                <i class="fa-solid ${icon} text-xs opacity-50"></i> ${log.details}
            </div>
        `;
        historyLog.appendChild(item);
    });
}

/**
 * Logic
 */
function handleBenchClick(benchId, event, element) {
    if (appState.heldBy === 'Anonymous') {
        SoundEngine.playAlert();
        showToast("Cannot act: Someone else has the diary!", "error");
        return;
    }

    // Click Confirmation Visual
    element.classList.remove('click-confirm');
    void element.offsetWidth; // Trigger reflow
    element.classList.add('click-confirm');

    const { timeStr } = getTimeData();

    // ACTION: Place
    if (appState.heldBy === 'You') {
        if (appState.diaryLocation === null) {
            SoundEngine.playSuccess();
            appState.diaryLocation = benchId;
            appState.heldBy = null;
            addHistory('placed', `Hidden on Bench #${benchId}`, 'You');
            saveAndRender();
            showToast(`Diary placed on Bench #${benchId}`, "success");
        }
        return;
    }

    // ACTION: Take
    if (appState.diaryLocation === benchId && appState.heldBy === null) {
        SoundEngine.playTake();
        appState.diaryLocation = null;
        appState.heldBy = 'You';
        addHistory('taken', `Retrieved from Bench #${benchId}`, 'You');
        saveAndRender();
        showToast("You retrieved the diary!", "success");
        return;
    }

    // Empty Bench
    SoundEngine.playClick();
    if (appState.diaryLocation) {
        showToast(`Empty. Check Bench #${appState.diaryLocation}`, "info");
    } else {
        showToast("Bench is empty.", "info");
    }
}

function handleSimulateActivity() {
    SoundEngine.playClick(); // Button sound

    if (appState.heldBy === 'You') {
        showToast("Simulation skipped: You hold the diary.", "warning");
        return;
    }

    if (appState.heldBy === 'Anonymous') {
        // Anonymous PLACES it
        const randomBench = Math.floor(Math.random() * 16) + 1;
        appState.diaryLocation = randomBench;
        appState.heldBy = null;
        
        SoundEngine.playSuccess();
        addHistory('placed', `Returned to Bench #${randomBench}`, 'Anonymous');
        showToast("Anonymous returned the diary.", "info");
    } else if (appState.diaryLocation !== null) {
        // Anonymous TAKES it
        const fromBench = appState.diaryLocation;
        
        // Trigger Visual Indicator for Vacated Bench
        recentlyVacatedBench = fromBench; 
        setTimeout(() => { recentlyVacatedBench = null; }, 1000); // Clear after animation

        appState.diaryLocation = null;
        appState.heldBy = 'Anonymous';
        
        SoundEngine.playAlert();
        addHistory('taken', `Taken from Bench #${fromBench}`, 'Anonymous');
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
        success: { color: 'bg-green-600', icon: 'fa-check' },
        error: { color: 'bg-red-600', icon: 'fa-exclamation' },
        warning: { color: 'bg-orange-500', icon: 'fa-bell' },
        info: { color: 'bg-slate-700', icon: 'fa-info' }
    };
    
    const style = config[type];
    
    toast.className = `toast ${style.color} text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 min-w-[300px] pointer-events-auto`;
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
    // Laptop
    const laptop = document.getElementById('teacher-laptop');
    if(laptop) {
        laptop.onclick = () => {
            SoundEngine.playMagic();
            laptop.classList.add('laptop-hacked');
            showToast("System Hacked: Admin Access Granted", "warning");
            setTimeout(() => laptop.classList.remove('laptop-hacked'), 1500);
        };
    }
    // Windows
    document.getElementById('windows-group').onclick = () => {
        SoundEngine.playClick();
        showToast("It's a beautiful day outside.", "info");
    };
}

document.addEventListener('DOMContentLoaded', init);
