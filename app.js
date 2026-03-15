import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyADb6_S_9_rvSJiUJm-r87U2Ezc6J_OK7Q",
  authDomain: "caminho-da-liberdade.firebaseapp.com",
  databaseURL: "https://caminho-da-liberdade-default-rtdb.firebaseio.com",
  projectId: "caminho-da-liberdade",
  storageBucket: "caminho-da-liberdade.firebasestorage.app",
  messagingSenderId: "981735473320",
  appId: "1:981735473320:web:88030d42a86f7c6848829d"
};

const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);

// Hash Generator for DB ID
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

const FIXED_PIN = "4861";
const currentUserHash = simpleHash(FIXED_PIN);

// Data Models
const STATE_KEY = 'caminho_liberdade_state';

const defaultState = {
    successDays: [], // Array of format "YYYY-MM-DD"
    lastMilestoneReached: 0,
    notes: [], // Array of { id, dateISO, text }
    seenCasosIndices: [], // Track indices of seen stories to prevent repetition
    seenLeituraIndices: [] // Track indices of seen verses
};

let appState = { ...defaultState };

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
const btnNaofaz = document.getElementById('btn-naofaz');

const diaryOverlay = document.getElementById('diary-overlay');
const btnCloseDiary = document.getElementById('btn-close-diary');
const btnSaveNote = document.getElementById('btn-save-note');
const diaryTextarea = document.getElementById('diary-textarea');
const diaryList = document.getElementById('diary-list');

// Elements - Celebration
const celebrationOverlay = document.getElementById('celebration-overlay');
const celebrationMessage = document.getElementById('celebration-message');
const btnCloseCelebration = document.getElementById('btn-close-celebration');

let currentPinInput = '';

// Content Data (Massive Expansion)
const casosData = [
    { title: "A Ruína Financeira de Marcos", content: "O que começou como vídeos gratuitos evoluiu para salas de bate-papo pagas. Marcos perdeu suas economias, estourou limites de cartão e se endividou pesadamente, perdendo seu apartamento por não conseguir parar o ciclo de recompensa." },
    { title: "Danos Cerebrais e Ansiedade (Pedro)", content: "Pedro desenvolveu ansiedade social aguda e disfunção erétil induzida pelo vício. Seu cérebro foi duramente dessensibilizado pela dopamina constante, necessitando de materiais cada vez mais extremos." },
    { title: "O Isolamento de Lucas", content: "Aos 22 anos, Lucas trancou a faculdade e parou de sair de casa, passando os dias deitado navegando na internet. A vergonha o impediu de buscar ajuda até perceber que havia perdido completamente sua rede de amigos." },
    { title: "A Dupla Vida de Carlos", content: "Carlos tinha um emprego de sucesso, mas usava a internet do trabalho para consumir conteúdos em horário de expediente. Foi descoberto pelo TI e demitido por justa causa, perdendo a carreira de uma década." },
    { title: "Disfunção e Divórcio (Felipe)", content: "Mesmo jovem (26 anos), Felipe não conseguia consumar seu casamento porque seu cérebro já estava programado para telas, desenvolvendo impotência psicológica irreversível semanas após se casar." },
    { title: "A Destruição da Autoconfiança (Thiago)", content: "Thiago passou 8 anos preso no vício. Ele parou de se exercitar, desenvolveu gagueira por falta de interação social e se sentia um lixo o tempo todo. A culpa destruía qualquer tentativa de ele progredir." },
    { title: "Depressão Induzida (Mateus)", content: "A superestimulação constante dos receptores de dopamina fez Mateus perder a capacidade de sentir prazer com coisas normais: comida, esportes, conversas. Ele foi diagnosticado com depressão clínica como resultado direto." },
    { title: "Escravidão Digital (Roberto)", content: "O vazio que Roberto tentava preencher o fez não comparecer ao aniversário da própria mãe nem ao hospital quando o pai sofreu um acidente grave. A rotina dele se resumia a correr pro quarto e trancar a porta." },
    { title: "A Mente Assombrada (Rafael)", content: "Rafael contava que mesmo longe das telas, imagens nojentas invadiam sua mente involuntariamente. As sinapses cerebrais dele já estavam tão poluídas que sua própria consciência virou seu maior terror, o impedindo de dormir em paz." },
    { title: "A Perda da Sensibilidade (Gabriel)", content: "O que começou suave longo se tornou pesado. Gabriel se encontrou buscando nichos e tabus bizarros para conseguir a mesma satisfação de antes. Sentiu repulsa de si mesmo ao ver até onde o vício empurrou seus limites." },
    { title: "O Ladrão de Tempo (André)", content: "André calculou que ao longo de 10 anos, ele perdeu cerca de 14.600 horas (equivalente a mais de um ano e meio ininterrupto) consumindo pornografia. Tempo que ele poderia ter usado para aprender idiomas, investir em si próprio ou construir uma família." },
    { title: "O Relacionamento Falso (Diego)", content: "Diego começou a pagar por interações virtuais personalizadas (OnlyFans), doando mais de $2000 dólares em meses na esperança de que as garotas fossem suas amigas reais. A ilusão estourou e o deixou num estado de solidão extrema." },
    { title: "Desmotivação e Desistência (Vítor)", content: "A pornografia inundava o cérebro de Vítor com tanta satisfação falsa que ele não sentia a menor vontade de lutar pelos seus sonhos. Tudo parecia difícil e sem cor. Ele abandonou 3 cursos e não conseguia parar em nenhum emprego." },
    { title: "A Vergonha Familiar (Leonardo)", content: "Leonardo esqueceu seu celular destravado na mesa durante o almoço de domingo. A sobrinha de 6 anos dele pegou pra jogar e viu as abas abertas no navegador. A família inteira se reuniu chocada. A humilhação foi indescritível." },
    { title: "Deterioração Visual (Caio)", content: "Caio passava tardes inteiras no escuro com o brilho da tela no máximo rolando a página por algo 'novo'. Seus olhos começaram a sofrer, ele desenvolveu secura ocular crônica severa e dores de cabeça latejantes diárias." },
    { title: "Ansiedade Severa (Marcelo)", content: "O vício instalou um mecanismo em Marcelo onde toda vez que ele ficava estressado, ele corria pra internet. Isso fez com que ele perdesse completamente a habilidade natural de lidar com o estresse da vida adulta, entrando em pânico no trabalho." },
    { title: "A Fuga da Realidade (Bruno)", content: "Aos 30 anos e morando com os pais, Bruno percebeu que a pornografia o mantinha confortável na sua zona de fracasso. Ela servia de 'anestesia' para ele não precisar enfrentar que a vida estava passando." },
    { title: "Isolamento Extremo (Renato)", content: "Renato acabou adquirindo tanto pavor de julgamento caso as pessoas descobrissem seu histórico no PC, que ele passou a afastar ativamente amigos íntimos e qualquer potencial namorada, morrendo de medo da intimidade real apontar pra culpa dele." }
];

const leituraData = [
    { ref: "1 Coríntios 10:13", text: "Não sobreveio a vocês tentação que não fosse comum aos homens. E Deus é fiel; ele não permitirá que vocês sejam tentados além do que podem suportar. Mas, quando forem tentados, ele lhes providenciará um escape." },
    { ref: "Salmos 119:9", text: "Como pode o jovem manter pura a sua conduta? Vivendo de acordo com a tua palavra." },
    { ref: "Filipenses 4:13", text: "Posso todas as coisas naquele que me fortalece." },
    { ref: "Provérbios 4:23", text: "Acima de tudo, guarde o seu coração, pois dele depende toda a sua vida." },
    { ref: "Tiago 4:7", text: "Portanto, submetam-se a Deus. Resistam ao Diabo, e ele fugirá de vocês." },
    { ref: "Romanos 12:2", text: "Não se amoldem ao padrão deste mundo, mas transformem-se pela renovação da sua mente..." },
    { ref: "Mateus 5:8", text: "Bem-aventurados os puros de coração, pois verão a Deus." },
    { ref: "1 Pedro 5:8", text: "Sejam sóbrios e vigiem. O diabo, o inimigo de vocês, anda ao redor como leão, rugindo e procurando a quem possa devorar." },
    { ref: "Gálatas 5:16", text: "Por isso digo: vivam pelo Espírito, e de modo nenhum satisfarão os desejos da carne." },
    { ref: "Salmos 51:10", text: "Cria em mim um coração puro, ó Deus, e renova dentro de mim um espírito estável." },
    { ref: "Mateus 26:41", text: "Vigiem e orem para que não caiam em tentação. O espírito está pronto, mas a carne é fraca." },
    { ref: "Isaías 41:10", text: "Por isso não tema, pois estou com você; não tenha medo, pois sou o seu Deus. Eu o fortalecerei e o ajudarei." },
    { ref: "Efésios 6:11", text: "Vistam toda a armadura de Deus, para poderem ficar firmes contra as ciladas do diabo." },
    { ref: "Provérbios 28:13", text: "Quem esconde os seus pecados não prospera, mas quem os confessa e os abandona encontra misericórdia." },
    { ref: "João 8:36", text: "Portanto, se o Filho os libertar, vocês de fato serão livres." },
    { ref: "Colossenses 3:5", text: "Assim, façam morrer tudo o que pertence à natureza terrena de vocês: imoralidade sexual, impureza, paixão, desejos maus e a ganância, que é idolatria." },
    { ref: "Hebreus 12:1", text: "Livremo-nos de tudo o que nos atrapalha e do pecado que nos envolve, e corramos com perseverança a corrida que nos é proposta." },
    { ref: "Salmos 101:3", text: "Não porei coisa má diante dos meus olhos. Odeio a obra daqueles que se desviam; não se apegará a mim." },
    { ref: "1 Tessalonicenses 4:3-4", text: "A vontade de Deus é que vocês sejam santificados: abstenham-se da imoralidade sexual. Cada um saiba controlar o seu próprio corpo de maneira santa e honrosa." },
    { ref: "Tiago 1:12", text: "Feliz é o homem que persevera na provação, porque depois de aprovado receberá a coroa da vida, que Deus prometeu aos que o amam." },
    { ref: "2 Timóteo 2:22", text: "Fuja dos desejos malignos da juventude e siga a justiça, a fé, o amor e a paz..." },
    { ref: "Provérbios 6:27-28", text: "Pode alguém colocar fogo no peito sem queimar a roupa? Pode alguém andar sobre brasas sem queimar os pés?" },
    { ref: "Josué 1:9", text: "Não fui eu que lhe ordenei? Seja forte e corajoso! Não se apavore, nem se desanime, pois o Senhor, o seu Deus, estará com você por onde você andar." },
    { ref: "1 Coríntios 6:18", text: "Fujam da imoralidade sexual. Todos os outros pecados que alguém comete, fora do corpo os comete; mas quem peca sexualmente, peca contra o seu próprio corpo." },
    { ref: "Romanos 8:13", text: "Pois se vocês viverem de acordo com a carne, morrerão; mas, se pelo Espírito fizerem morrer os atos do corpo, viverão." }
];

function getRandomUnseenItem(array, seenIndicesKey) {
    // Check if seen configuration exists, create if not
    if (!appState[seenIndicesKey]) {
        appState[seenIndicesKey] = [];
    }
    
    // Filter array to get only indices we haven't seen
    const unseenIndices = [];
    for (let i = 0; i < array.length; i++) {
        if (!appState[seenIndicesKey].includes(i)) {
            unseenIndices.push(i);
        }
    }
    
    // Se o usuário já viu todas as histórias/versículos, reseta a lista e recomeça!
    if (unseenIndices.length === 0) {
        appState[seenIndicesKey] = []; 
        for (let i = 0; i < array.length; i++) unseenIndices.push(i);
    }
    
    // Pick an unseen index randomly
    const randomIndex = unseenIndices[Math.floor(Math.random() * unseenIndices.length)];
    appState[seenIndicesKey].push(randomIndex);
    
    saveState(); // Saves the seen tracking to Firebase
    
    return array[randomIndex];
}

// --- Init & State ---
async function initApp() {
    // Hide reset since PIN is now fixed
    btnResetPassword.style.display = 'none';

    // Se já estiver logado (salvo na sessão atual no localstorage como validado)
    if (localStorage.getItem('is_logged_in') === 'true') {
        lockMessage.textContent = "Sincronizando com a nuvem...";
        await syncFromCloud();
        enterApp();
    } else {
        showLockScreen();
    }
}

function saveState() {
    localStorage.setItem(STATE_KEY, JSON.stringify(appState));
    
    // Save to Firestore
    setDoc(doc(db, "calendars", currentUserHash), appState).catch(e => {
        console.error("Erro ao salvar na nuvem:", e);
    });

    updateStreak();
}

async function syncFromCloud() {
    try {
        const docRef = doc(db, "calendars", currentUserHash);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const cloudData = docSnap.data();
            appState = {
                ...defaultState,
                ...cloudData,
                notes: cloudData.notes || [], // Backwards compatibility if 'notes' is missing
                seenCasosIndices: cloudData.seenCasosIndices || [], 
                seenLeituraIndices: cloudData.seenLeituraIndices || []
            };
            localStorage.setItem(STATE_KEY, JSON.stringify(appState));
        } else {
            // New user on cloud
            await setDoc(docRef, appState);
        }
    } catch (e) {
        console.error("Erro ao buscar da nuvem:", e);
    }
}

// --- Lock Screen Logic ---
function updatePinDisplay() {
    pinDots.forEach((dot, index) => {
        dot.classList.toggle('filled', index < currentPinInput.length);
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

function showError() {
    pinDisplay.classList.add('error');
    lockMessage.textContent = "Senha Incorreta.";
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    setTimeout(() => {
        pinDisplay.classList.remove('error');
        currentPinInput = '';
        lockMessage.textContent = "Digite sua senha para entrar";
        updatePinDisplay();
    }, 450);
}

async function handleEnter() {
    if (currentPinInput.length !== 4) return;

    if (currentPinInput === FIXED_PIN) {
        localStorage.setItem('is_logged_in', 'true');
        lockMessage.textContent = "Entrando...";
        await syncFromCloud();
        enterApp();
    } else {
        showError();
    }
}

function showLockScreen() {
    currentPinInput = '';
    lockScreen.classList.add('active');
    mainScreen.classList.remove('active');
    lockMessage.textContent = "Digite sua senha para entrar";
    updatePinDisplay();
}

function enterApp() {
    lockScreen.classList.remove('active');
    mainScreen.classList.add('active');
    renderCalendar();
    updateStreak();
}

keys.forEach(key => {
    key.addEventListener('click', () => { handleKeyClick(key.getAttribute('data-key')); });
});
btnClear.addEventListener('click', handleClear);
btnEnter.addEventListener('click', handleEnter);

btnLock.addEventListener('click', () => {
    localStorage.removeItem('is_logged_in');
    showLockScreen();
});

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

    // Fill empty cells
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
        
        if (dateStr === todayDateStr) cell.classList.add('today');
        if (appState.successDays.includes(dateStr)) cell.classList.add('success');

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
    
    if (navigator.vibrate) navigator.vibrate(50);

    if (index === -1) {
        appState.successDays.push(dateStr);
        cellElement.classList.add('success');
    } else {
        appState.successDays.splice(index, 1);
        cellElement.classList.remove('success');
    }
    
    // Sort reverse chronological
    appState.successDays.sort((a,b) => b.localeCompare(a));
    
    saveState();
}

btnPrevMonth.addEventListener('click', () => {
    displayMonth--;
    if (displayMonth < 0) { displayMonth = 11; displayYear--; }
    renderCalendar();
});

btnNextMonth.addEventListener('click', () => {
    displayMonth++;
    if (displayMonth > 11) { displayMonth = 0; displayYear++; }
    renderCalendar();
});

// --- Total Days & Custom Milestones Logic ---
function updateStreak() {
    // Agora o aplicativo apenas contabiliza o TOTAL de dias que você venceu! Sem resetar.
    const totalDays = Array.isArray(appState.successDays) ? appState.successDays.length : 0;
    
    currentStreakDisplay.textContent = `${totalDays} dia${totalDays !== 1 ? 's' : ''}`;
    
    if (totalDays > 0) {
        checkMilestones(totalDays);
    }
}

function checkMilestones(totalDays) {
    // Custom incentive milestones defined here
    const milestones = [1, 2, 3, 5, 7, 10, 15, 21, 30, 45, 60, 90, 120, 150, 180, 240, 300, 365, 500, 1000];
    
    const reached = milestones.filter(m => totalDays >= m);
    if(reached.length === 0) return;
    
    const maxMilestone = Math.max(...reached);

    if (maxMilestone > (appState.lastMilestoneReached || 0)) {
        appState.lastMilestoneReached = maxMilestone;
        localStorage.setItem(STATE_KEY, JSON.stringify(appState));
        setDoc(doc(db, "calendars", currentUserHash), appState).catch(console.error);
        
        showCelebration(maxMilestone);
    }
}

function showCelebration(days) {
    celebrationMessage.textContent = `Você conquistou a impressionante marca de ${days} dia(s) totais limpo! A verdadeira mudança se dá um dia de cada vez. Tenha orgulho do guerreiro que está se tornando.`;
    celebrationOverlay.classList.add('active');
    
    if(navigator.vibrate) navigator.vibrate([150, 50, 150, 50, 300]);
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
    const item = getRandomUnseenItem(casosData, 'seenCasosIndices');
    const html = `
        <h4 style="color: #f85149;">${item.title}</h4>
        <p>${item.content}</p>
        <div style="margin-top: 2rem; font-size: 0.85rem; color: var(--text-secondary); text-align: center; border-top: 1px solid var(--border-color); padding-top: 1rem;">
            * Acordar para a realidade é doloroso, mas muito menos pior do que viver essas consequências amargamente.
        </div>
    `;
    openModal("Consequência Real", html);
});

btnLeitura.addEventListener('click', () => {
    const item = getRandomUnseenItem(leituraData, 'seenLeituraIndices');
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
    if(e.target === modalOverlay) modalOverlay.classList.remove('active');
});
diaryOverlay.addEventListener('click', (e) => {
    if(e.target === diaryOverlay) diaryOverlay.classList.remove('active');
});

// --- Diary (Não Faz) Logic ---
function openDiary() {
    renderDiaryNotes();
    diaryTextarea.value = '';
    diaryOverlay.classList.add('active');
}

function renderDiaryNotes() {
    diaryList.innerHTML = '';
    
    if (!appState.notes || appState.notes.length === 0) {
        diaryList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">As suas anotações aparecerão aqui. Ninguém além de você pode lê-las.</p>';
        return;
    }
    
    // Sort latest first
    const sortedNotes = [...appState.notes].sort((a,b) => new Date(b.dateISO) - new Date(a.dateISO));
    
    sortedNotes.forEach(note => {
        const d = new Date(note.dateISO);
        const dateString = `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`;
        
        const noteDiv = document.createElement('div');
        noteDiv.className = 'diary-note';
        
        noteDiv.innerHTML = `
            <div class="diary-note-header">
                <span><i class="fa-regular fa-clock"></i> ${dateString}</span>
            </div>
            <div class="diary-note-text">${note.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        `;
        diaryList.appendChild(noteDiv);
    });
}

btnNaofaz.addEventListener('click', openDiary);
btnCloseDiary.addEventListener('click', () => diaryOverlay.classList.remove('active'));

btnSaveNote.addEventListener('click', () => {
    const text = diaryTextarea.value.trim();
    if (!text) return;
    
    if (!appState.notes) appState.notes = [];
    
    appState.notes.push({
        id: Date.now().toString(),
        dateISO: new Date().toISOString(),
        text: text
    });
    
    if (navigator.vibrate) navigator.vibrate(50);
    saveState();
    
    diaryTextarea.value = '';
    renderDiaryNotes();
});

// Start the App
document.addEventListener('DOMContentLoaded', initApp);
