const STORAGE_KEY = "wala-kalima-state-v1";
const DEFAULT_ITEMS = [
  "باب الحارة",
  "طاش ما طاش",
  "رشاش",
  "سكة سفر",
  "الهيبة",
  "The Voice",
  "أحلام",
  "عمرو دياب",
  "تاج",
  "واي فاي",
];

const state = {
  teamAName: "الفريق أ",
  teamBName: "الفريق ب",
  teamAScore: 0,
  teamBScore: 0,
  items: [...DEFAULT_ITEMS],
  soundOn: true,
  noRepeatCycle: false,
  usedItems: [],
  lastPicked: null,
};

const el = {
  wheel: document.getElementById("wheel"),
  spinBtn: document.getElementById("spinBtn"),
  result: document.getElementById("result"),
  soundToggle: document.getElementById("soundToggle"),
  noRepeatCycle: document.getElementById("noRepeatCycle"),
  teamAName: document.getElementById("teamAName"),
  teamBName: document.getElementById("teamBName"),
  teamAScore: document.getElementById("teamAScore"),
  teamBScore: document.getElementById("teamBScore"),
  resetScores: document.getElementById("resetScores"),
  itemInput: document.getElementById("itemInput"),
  addItemsBtn: document.getElementById("addItemsBtn"),
  clearItemsBtn: document.getElementById("clearItemsBtn"),
  itemsList: document.getElementById("itemsList"),
  jsonBox: document.getElementById("jsonBox"),
  exportJsonBtn: document.getElementById("exportJsonBtn"),
  importJsonBtn: document.getElementById("importJsonBtn"),
  timerDisplay: document.getElementById("timerDisplay"),
  timerStatus: document.getElementById("timerStatus"),
  startTimer: document.getElementById("startTimer"),
  pauseTimer: document.getElementById("pauseTimer"),
  resetTimer: document.getElementById("resetTimer"),
};

let wheelRotation = 0;
let isSpinning = false;
let timerRemaining = 120;
let timerInterval = null;

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    Object.assign(state, data);
    if (!Array.isArray(state.items)) state.items = [...DEFAULT_ITEMS];
    if (!Array.isArray(state.usedItems)) state.usedItems = [];
  } catch {
    // fallback silently to defaults
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function randomColor(index, total) {
  const hue = Math.round((index / Math.max(total, 1)) * 360);
  return `hsl(${hue} 75% 55%)`;
}

function renderWheel() {
  const count = state.items.length;
  if (!count) {
    el.wheel.style.background = "#1e293b";
    el.wheel.innerHTML = "";
    return;
  }

  const segments = state.items
    .map((_, i) => {
      const start = (i / count) * 100;
      const end = ((i + 1) / count) * 100;
      const color = randomColor(i, count);
      return `${color} ${start}% ${end}%`;
    })
    .join(", ");

  el.wheel.style.background = `conic-gradient(${segments})`;

  const labels = state.items
    .map((item, i) => {
      const angle = (360 / count) * i + 360 / count / 2;
      return `<span style="position:absolute;left:50%;top:50%;transform:rotate(${angle}deg) translateY(-42%) translateX(-50%);transform-origin:center -42%;font-size:0.75rem;font-weight:700;color:#001018;text-shadow:0 0 2px #fff;">${escapeHtml(item.slice(0, 14))}</span>`;
    })
    .join("");

  el.wheel.innerHTML = labels;
}

function renderScores() {
  el.teamAName.value = state.teamAName;
  el.teamBName.value = state.teamBName;
  el.teamAScore.textContent = state.teamAScore;
  el.teamBScore.textContent = state.teamBScore;
}

function renderItems() {
  if (!state.items.length) {
    el.itemsList.innerHTML = "<li>لا توجد عناصر حالياً</li>";
    renderWheel();
    return;
  }

  el.itemsList.innerHTML = state.items
    .map(
      (item, idx) =>
        `<li><span>${escapeHtml(item)}</span><button class="btn danger" data-remove-index="${idx}">حذف</button></li>`
    )
    .join("");

  renderWheel();
}

function renderSound() {
  el.soundToggle.textContent = state.soundOn ? "مُفعل" : "مُعطل";
  el.soundToggle.setAttribute("aria-pressed", String(state.soundOn));
}

function renderNoRepeat() {
  el.noRepeatCycle.checked = !!state.noRepeatCycle;
}

function playBeep(durationMs = 170, freq = 740) {
  if (!state.soundOn) return;
  const context = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = freq;
  gain.gain.setValueAtTime(0.001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + durationMs / 1000);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + durationMs / 1000);
}

function eligibleItems() {
  if (!state.noRepeatCycle) {
    if (state.items.length <= 1) return [...state.items];
    return state.items.filter((item) => item !== state.lastPicked);
  }

  const remaining = state.items.filter((item) => !state.usedItems.includes(item));
  if (remaining.length) return remaining;

  state.usedItems = [];
  return [...state.items];
}

function spinWheel() {
  if (isSpinning || !state.items.length) return;

  const pool = eligibleItems();
  if (!pool.length) return;

  const selected = pool[Math.floor(Math.random() * pool.length)];
  const index = state.items.indexOf(selected);
  const count = state.items.length;
  const segment = 360 / count;
  const targetCenterAngle = index * segment + segment / 2;
  const finalAngle = 360 - targetCenterAngle;
  const extraTurns = 360 * (5 + Math.floor(Math.random() * 3));
  wheelRotation += extraTurns + finalAngle - (wheelRotation % 360);

  isSpinning = true;
  el.spinBtn.disabled = true;
  el.wheel.style.transition = "transform 4.2s cubic-bezier(0.17, 0.67, 0.19, 1)";
  el.wheel.style.transform = `rotate(${wheelRotation}deg)`;
  playBeep(120, 660);

  setTimeout(() => {
    isSpinning = false;
    el.spinBtn.disabled = false;
    state.lastPicked = selected;
    if (state.noRepeatCycle && !state.usedItems.includes(selected)) {
      state.usedItems.push(selected);
    }
    el.result.textContent = `🎯 النتيجة: ${selected}`;
    playBeep(220, 880);
    saveState();
  }, 4300);
}

function parseInputItems(raw) {
  return raw
    .split(/[\n,،]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function addItemsFromInput() {
  const entries = parseInputItems(el.itemInput.value);
  if (!entries.length) return;
  entries.forEach((entry) => {
    if (!state.items.includes(entry)) state.items.push(entry);
  });
  el.itemInput.value = "";
  state.usedItems = state.usedItems.filter((x) => state.items.includes(x));
  renderItems();
  saveState();
}

function removeItemAt(index) {
  const [removed] = state.items.splice(index, 1);
  if (removed && state.lastPicked === removed) state.lastPicked = null;
  state.usedItems = state.usedItems.filter((x) => x !== removed);
  renderItems();
  saveState();
}

function setupScoreButtons() {
  document.querySelectorAll("[data-team][data-delta]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const team = btn.getAttribute("data-team");
      const delta = Number(btn.getAttribute("data-delta"));
      if (team === "A") state.teamAScore += delta;
      if (team === "B") state.teamBScore += delta;
      renderScores();
      saveState();
      playBeep(70, delta > 0 ? 520 : 280);
    });
  });
}

function renderTimer() {
  const min = String(Math.floor(timerRemaining / 60)).padStart(2, "0");
  const sec = String(timerRemaining % 60).padStart(2, "0");
  el.timerDisplay.textContent = `${min}:${sec}`;
}

function startTimer() {
  if (timerInterval) return;
  el.timerStatus.textContent = "المؤقت يعمل...";
  timerInterval = setInterval(() => {
    timerRemaining -= 1;
    renderTimer();
    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      timerRemaining = 0;
      renderTimer();
      el.timerStatus.textContent = "⏰ انتهى الوقت!";
      playBeep(350, 240);
      if (navigator.vibrate) navigator.vibrate([140, 80, 140]);
    }
  }, 1000);
}

function pauseTimer() {
  if (!timerInterval) return;
  clearInterval(timerInterval);
  timerInterval = null;
  el.timerStatus.textContent = "تم الإيقاف المؤقت";
}

function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRemaining = 120;
  renderTimer();
  el.timerStatus.textContent = "جاهز للبدء";
}

function bindEvents() {
  el.spinBtn.addEventListener("click", spinWheel);
  el.soundToggle.addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    renderSound();
    saveState();
  });

  el.noRepeatCycle.addEventListener("change", () => {
    state.noRepeatCycle = el.noRepeatCycle.checked;
    if (!state.noRepeatCycle) state.usedItems = [];
    saveState();
  });

  el.teamAName.addEventListener("input", () => {
    state.teamAName = el.teamAName.value.trim() || "الفريق أ";
    saveState();
  });

  el.teamBName.addEventListener("input", () => {
    state.teamBName = el.teamBName.value.trim() || "الفريق ب";
    saveState();
  });

  el.resetScores.addEventListener("click", () => {
    state.teamAScore = 0;
    state.teamBScore = 0;
    renderScores();
    saveState();
  });

  el.addItemsBtn.addEventListener("click", addItemsFromInput);
  el.clearItemsBtn.addEventListener("click", () => {
    state.items = [];
    state.usedItems = [];
    state.lastPicked = null;
    renderItems();
    saveState();
  });

  el.itemsList.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-remove-index]");
    if (!btn) return;
    removeItemAt(Number(btn.getAttribute("data-remove-index")));
  });

  el.exportJsonBtn.addEventListener("click", () => {
    el.jsonBox.value = JSON.stringify(state.items, null, 2);
  });

  el.importJsonBtn.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(el.jsonBox.value);
      if (!Array.isArray(parsed)) throw new Error();
      state.items = parsed.map((x) => String(x).trim()).filter(Boolean);
      state.usedItems = [];
      state.lastPicked = null;
      renderItems();
      saveState();
    } catch {
      el.timerStatus.textContent = "صيغة JSON غير صحيحة";
    }
  });

  el.startTimer.addEventListener("click", startTimer);
  el.pauseTimer.addEventListener("click", pauseTimer);
  el.resetTimer.addEventListener("click", resetTimer);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js");
    });
  }
}

function init() {
  loadState();
  renderScores();
  renderSound();
  renderNoRepeat();
  renderItems();
  renderTimer();
  bindEvents();
  setupScoreButtons();
  registerServiceWorker();
}

init();
