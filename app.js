import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAvUP2je92Dt9S8KmhbQzlv7Jh17nh27dQ",
  authDomain: "projeto1-d2f46.firebaseapp.com",
  projectId: "projeto1-d2f46",
  storageBucket: "projeto1-d2f46.firebasestorage.app",
  messagingSenderId: "31370509869",
  appId: "1:31370509869:web:1a2a6a3eca09d1167a82a4",
  measurementId: "G-5Z9Z1EL6Q7"
};

const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);

// Data Models
const STATE_KEY = 'caminho_liberdade_state';

const defaultState = {
    successDays: [], // Array of format "YYYY-MM-DD"
    lastMilestoneReached: 0
};

let appState = { ...defaultState };
let currentUserHash = null;

// Elements - Lock Screen
const lockScreen = document.getElementById('lock-screen');
const mainScreen = document.getElementById('main-screen');
const pinDisplay = document.getElementById('pin-display');
const pinDots = pinDisplay.querySelectorAll('.dot');
const keys = document.querySelectorAll('.key[data-key]');
const btnClear = document.getElementById('btn-clear');
const btnEnter = document.getElementById('btn-enter');
const lockMessage = document.getElementById('lock-message');
const btnResetPassword = document.getElementById('btn-reset-password');

// Elements - App
const currentDateObj = new Date();
let displayMonth = currentDateObj.getMonth();
let displayYear = currentDateObj.getFullYear();

const monthYearDisplay = document.getElementById('month-year-display');
const calendarGrid = document.getElementById('calendar-grid');
const btnPrevMonth = document.getElementById('prev-month');
const btnNextMonth = document.getElementById('next-month');
const currentStreakDisplay = document.getElementById('current-streak');
const btnLock = document.getElementById('btn-lock');

// Elements - Modals
const modalOverlay = document.getElementById('modal-overlay');
const btnCloseModal = document.getElementById('btn-close-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const btnCasos = document.getElementById('btn-casos');
const btnLeitura = document.getElementById('btn-leitura');

// Elements - Celebration
const celebrationOverlay = document.getElementById('celebration-overlay');
const celebrationMessage = document.getElementById('celebration-message');
const btnCloseCelebration = document.getElementById('btn-close-celebration');

// Logic Variables
let currentPinInput = '';
let settingUpPin = false;
let confirmPinMode = false;
let firstPinEntry = '';

// Content Data
const casosData = [
    {
        title: "Caso de João (Nome Fictício)",
        content: "João perdeu seu casamento de 5 anos após sua esposa descobrir que ele passava horas na madrugada consumindo material e escondendo sua situação. O vício afetou sua libido com a parceira real, causando distanciamento emocional permanente e o fim da relação."
    },
    {
        title: "A Ruína Financeira de Marcos",
        content: "O que começou como vídeos gratuitos evoluiu para salas de bate-papo pagas e doações em plataformas online. Marcos perdeu suas economias, estourou limites de cartão e se endividou pesadamente, perdendo seu apartamento por não conseguir parar o ciclo de recompensa imediata."
    },
    {
        title: "Danos Cerebrais e Ansiedade (Pedro)",
        content: "Pedro desenvolveu ansiedade social aguda e disfunção erétil induzida pelo vício, sendo incapaz de se relacionar em sua vida real. Seu cérebro foi duramente dessensibilizado pela dopamina constante, necessitando de materiais cada vez mais extremos para sentir algo."
    },
    {
        title: "O Isolamento de Lucas",
        content: "Aos 22 anos, Lucas trancou a faculdade e parou de sair de casa, passando os dias deitado navegando na internet. A vergonha e a letargia o impediram de buscar ajuda até ele perceber que havia perdido completamente sua rede de amigos."
    }
];

const leituraData = [
    {
        ref: "1 Coríntios 10:13",
        text: "Não sobreveio a vocês tentação que não fosse comum aos homens. E Deus é fiel; ele não permitirá que vocês sejam tentados além do que podem suportar. Mas, quando forem tentados, ele lhes providenciará um escape, para que o possam suportar."
    },
    {
        ref: "Salmos 119:9",
        text: "Como pode o jovem manter pura a sua conduta? Vivendo de acordo com a tua palavra."
    },
    {
        ref: "Filipenses 4:13",
        text: "Posso todas as coisas naquele que me fortalece."
    },
    {
        ref: "Provérbios 4:23",
        text: "Acima de tudo, guarde o seu coração, pois dele depende toda a sua vida."
    },
    {
        ref: "Tiago 4:7",
        text: "Portanto, submetam-se a Deus. Resistam ao Diabo, e ele fugirá de vocês."
    },
    {
        ref: "Romanos 12:2",
        text: "Não se amoldem ao padrão deste mundo, mas transformem-se pela renovação da sua mente, para que sejam capazes de experimentar e comprovar a boa, agradável e perfeita vontade de Deus."
    }
];

function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// --- Init & State ---
function initApp() {
    const savedState = localStorage.getItem(STATE_KEY);
    if (savedState) {
        try {
            appState = JSON.parse(savedState);
        } catch(e) {
            console.error("Erro ao carregar os dados:", e);
        }
    }

    const savedPinHash = localStorage.getItem('saved_pin_hash');
    if (!savedPinHash) {
        setupInitialPin();
    } else {
        showLockScreen();
    }
}

function saveState() {
    localStorage.setItem(STATE_KEY, JSON.stringify(appState));
    
    // Save to Firestore
    if (currentUserHash) {
        setDoc(doc(db, "calendars", currentUserHash), appState).catch(e => {
            console.error("Erro ao salvar na nuvem:", e);
        });
    }

    updateStreak();
}

async function syncFromCloud(hash) {
    lockMessage.textContent = "Sincronizando com a nuvem...";
    try {
        const docRef = doc(db, "calendars", hash);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            appState = docSnap.data();
            localStorage.setItem(STATE_KEY, JSON.stringify(appState));
        } else {
            // New user on cloud, let's sync local to cloud
            await setDoc(docRef, appState);
        }
    } catch (e) {
        console.error("Erro ao buscar da nuvem:", e);
    }
}

// --- Lock Screen Logic ---

function updatePinDisplay() {
    pinDots.forEach((dot, index) => {
        if (index < currentPinInput.length) {
            dot.classList.add('filled');
        } else {
            dot.classList.remove('filled');
        }
    });
}

function handleKeyClick(key) {
    if (currentPinInput.length < 4) {
        currentPinInput += key;
        updatePinDisplay();
        
        if (currentPinInput.length === 4) {
             setTimeout(handleEnter, 200);
        }
    }
}

function handleClear() {
    currentPinInput = currentPinInput.slice(0, -1);
    updatePinDisplay();
}

// Hash simples
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

function showError() {
    pinDisplay.classList.add('error');
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    setTimeout(() => {
        pinDisplay.classList.remove('error');
        currentPinInput = '';
        updatePinDisplay();
    }, 450);
}

async function handleEnter() {
    if (currentPinInput.length !== 4) return;

    if (settingUpPin) {
        if (!confirmPinMode) {
            firstPinEntry = currentPinInput;
            currentPinInput = '';
            confirmPinMode = true;
            lockMessage.textContent = "Confirme sua senha";
            updatePinDisplay();
        } else {
            if (currentPinInput === firstPinEntry) {
                currentUserHash = simpleHash(currentPinInput);
                localStorage.setItem('saved_pin_hash', currentUserHash);
                
                await syncFromCloud(currentUserHash);
                enterApp();
            } else {
                showError();
                lockMessage.textContent = "Senhas não coincidem. Tente de novo.";
                confirmPinMode = false;
                firstPinEntry = '';
                setTimeout(() => {
                    lockMessage.textContent = "Crie uma senha de 4 dígitos";
                }, 1500);
            }
        }
    } else {
        // Verification Mode
        const inputHash = simpleHash(currentPinInput);
        if (inputHash === localStorage.getItem('saved_pin_hash')) {
            currentUserHash = inputHash;
            await syncFromCloud(currentUserHash);
            enterApp();
        } else {
            showError();
        }
    }
}

function setupInitialPin() {
    settingUpPin = true;
    confirmPinMode = false;
    currentPinInput = '';
    firstPinEntry = '';
    lockScreen.classList.add('active');
    mainScreen.classList.remove('active');
    lockMessage.textContent = "Crie uma senha de 4 dígitos para privacidade";
    btnResetPassword.style.display = 'none';
    updatePinDisplay();
}

function showLockScreen() {
    settingUpPin = false;
    currentPinInput = '';
    lockScreen.classList.add('active');
    mainScreen.classList.remove('active');
    lockMessage.textContent = "Digite sua senha para entrar";
    btnResetPassword.style.display = 'block';
    updatePinDisplay();
}

function enterApp() {
    lockScreen.classList.remove('active');
    mainScreen.classList.add('active');
    renderCalendar();
    updateStreak();
}

keys.forEach(key => {
    key.addEventListener('click', () => {
        handleKeyClick(key.getAttribute('data-key'));
    });
});
btnClear.addEventListener('click', handleClear);
btnEnter.addEventListener('click', handleEnter);

btnResetPassword.addEventListener('click', () => {
    if(confirm("Tem certeza? Isso apagará os dados deste dispositivo. Seus dados na nuvem com este PIN continuarão salvos.")) {
        appState = { ...defaultState };
        localStorage.removeItem(STATE_KEY);
        localStorage.removeItem('saved_pin_hash');
        setupInitialPin();
    }
});

btnLock.addEventListener('click', showLockScreen);

// --- Calendar Logic ---

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function formatDateString(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isFutureDate(year, month, day) {
    const checkDate = new Date(year, month, day);
    const today = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth(), currentDateObj.getDate());
    return checkDate > today;
}

function renderCalendar() {
    calendarGrid.innerHTML = '';
    monthYearDisplay.textContent = `${MONTHS[displayMonth]} ${displayYear}`;

    const firstDay = new Date(displayYear, displayMonth, 1).getDay();
    const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();

    const todayDateStr = formatDateString(currentDateObj.getFullYear(), currentDateObj.getMonth(), currentDateObj.getDate());

    // Fill empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell empty';
        calendarGrid.appendChild(emptyCell);
    }

    // Fill days
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.textContent = day;

        const dateStr = formatDateString(displayYear, displayMonth, day);
        
        if (dateStr === todayDateStr) {
            cell.classList.add('today');
        }

        if (appState.successDays.includes(dateStr)) {
            cell.classList.add('success');
        }

        if (isFutureDate(displayYear, displayMonth, day)) {
            cell.classList.add('future');
        } else {
            cell.addEventListener('click', () => toggleDay(dateStr, cell));
        }

        calendarGrid.appendChild(cell);
    }
}

function toggleDay(dateStr, cellElement) {
    const index = appState.successDays.indexOf(dateStr);
    
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }

    if (index === -1) {
        appState.successDays.push(dateStr);
        cellElement.classList.add('success');
    } else {
        appState.successDays.splice(index, 1);
        cellElement.classList.remove('success');
    }
    
    appState.successDays.sort((a,b) => b.localeCompare(a));
    
    saveState();
}

btnPrevMonth.addEventListener('click', () => {
    displayMonth--;
    if (displayMonth < 0) {
        displayMonth = 11;
        displayYear--;
    }
    renderCalendar();
});

btnNextMonth.addEventListener('click', () => {
    displayMonth++;
    if (displayMonth > 11) {
        displayMonth = 0;
        displayYear++;
    }
    renderCalendar();
});

// --- Streak and Milestones Logic ---
function updateStreak() {
    if (!appState.successDays || appState.successDays.length === 0) {
        currentStreakDisplay.textContent = "0 dias";
        appState.lastMilestoneReached = 0;
        return;
    }
    
    const sortedDates = appState.successDays.map(d => {
        const parts = d.split('-');
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }).sort((a, b) => b.getTime() - a.getTime());
    
    const today = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth(), currentDateObj.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const latestDate = sortedDates[0];

    // Se o último marco for mais velho que ontem, a ofensiva zerou
    if (latestDate.getTime() !== today.getTime() && latestDate.getTime() !== yesterday.getTime()) {
        currentStreakDisplay.textContent = "0 dias";
        appState.lastMilestoneReached = 0;
        
        if(currentUserHash) {
            setDoc(doc(db, "calendars", currentUserHash), appState).catch(console.error);
        }
        localStorage.setItem(STATE_KEY, JSON.stringify(appState));
        return;
    }

    let streak = 1;
    for (let i = 0; i < sortedDates.length - 1; i++) {
        const curr = sortedDates[i];
        const next = sortedDates[i+1];
        
        const diffTime = curr.getTime() - next.getTime();
        const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
        
        if (diffDays === 1) {
            streak++;
        } else {
            break;
        }
    }

    currentStreakDisplay.textContent = `${streak} dia${streak !== 1 ? 's' : ''}`;
    checkMilestones(streak);
}

function checkMilestones(streak) {
    const milestones = [10, 30, 90, 180, 365, 500, 1000];
    const reached = milestones.filter(m => streak >= m);
    if(reached.length === 0) return;
    
    const maxMilestone = Math.max(...reached);

    if (maxMilestone > appState.lastMilestoneReached) {
        appState.lastMilestoneReached = maxMilestone;
        
        localStorage.setItem(STATE_KEY, JSON.stringify(appState));
        if (currentUserHash) {
            setDoc(doc(db, "calendars", currentUserHash), appState).catch(console.error);
        }
        
        showCelebration(maxMilestone);
    }
}

function showCelebration(days) {
    celebrationMessage.textContent = `Que incrível! Você alcançou a marca de ${days} dias de purificação e disciplina. Seu esforço está construindo um caráter inabalável! Continue firme!`;
    celebrationOverlay.classList.add('active');
    
    if(navigator.vibrate) {
        navigator.vibrate([150, 50, 150, 50, 300]);
    }
}

btnCloseCelebration.addEventListener('click', () => {
    celebrationOverlay.classList.remove('active');
});

// --- Escudos (Action Buttons) Logic ---
function openModal(title, contentHTML) {
    modalTitle.textContent = title;
    modalBody.innerHTML = contentHTML;
    modalOverlay.classList.add('active');
}

btnCasos.addEventListener('click', () => {
    const item = getRandomItem(casosData);
    const html = `
        <h4 style="color: #f85149;">${item.title}</h4>
        <p>${item.content}</p>
        <div style="margin-top: 2rem; font-size: 0.85rem; color: var(--text-secondary); text-align: center; border-top: 1px solid var(--border-color); padding-top: 1rem;">
            * Histórias baseadas em consequências reais da dependência. O objetivo aqui é te lembrar do que você está evitando.
        </div>
    `;
    openModal("Consequência Real", html);
});

btnLeitura.addEventListener('click', () => {
    const item = getRandomItem(leituraData);
    const html = `
        <i class="fa-solid fa-quote-left" style="font-size: 2rem; color: var(--bg-tertiary); margin-bottom: 1rem; display: block;"></i>
        <p style="font-size: 1.15rem; font-style: italic; line-height: 1.8;">"${item.text}"</p>
        <h4 style="text-align: right; margin-top: 1.5rem; color: #82b1ff;">- ${item.ref}</h4>
    `;
    openModal("Palavra de Força", html);
});

btnCloseModal.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
});

modalOverlay.addEventListener('click', (e) => {
    if(e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
    }
});

// App Entry Point
document.addEventListener('DOMContentLoaded', initApp);
