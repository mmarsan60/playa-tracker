import { firebaseConfig, APP_OPTIONS } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const DEFAULT_PLAYERS = [
  { id: "maria", name: "María" },
  { id: "amigo", name: "Pablo" }
];

const EFFECTIVE_OPTIONS = {
  ...APP_OPTIONS,
  startDate: APP_OPTIONS.startDate || "2026-06-15",
  endDate: APP_OPTIONS.endDate || "2026-09-06",
  morningCutoff: APP_OPTIONS.morningCutoff || "13:00",
  defaultPlayers: Array.isArray(APP_OPTIONS.defaultPlayers) && APP_OPTIONS.defaultPlayers.length >= 2
    ? APP_OPTIONS.defaultPlayers.slice(0, 2).map((player, index) => ({
        id: index === 0 ? "maria" : "amigo",
        name: player.name || DEFAULT_PLAYERS[index].name
      }))
    : DEFAULT_PLAYERS
};

const state = {
  db: null,
  leagueId: "",
  settings: {
    startDate: EFFECTIVE_OPTIONS.startDate,
    endDate: EFFECTIVE_OPTIONS.endDate,
    morningCutoff: EFFECTIVE_OPTIONS.morningCutoff,
    players: EFFECTIVE_OPTIONS.defaultPlayers
  },
  days: new Map(),
  unsubscribeCompetition: null,
  dayUnsubscribers: [],
  usingLocalMode: false
};

const els = {
  setupWarning: document.querySelector("#setupWarning"),
  copyLinkBtn: document.querySelector("#copyLinkBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  settingsBtn: document.querySelector("#settingsBtn"),
  settingsDialog: document.querySelector("#settingsDialog"),
  settingsForm: document.querySelector("#settingsForm"),
  cancelSettingsBtn: document.querySelector("#cancelSettingsBtn"),
  playerOneName: document.querySelector("#playerOneName"),
  playerTwoName: document.querySelector("#playerTwoName"),
  startDate: document.querySelector("#startDate"),
  endDate: document.querySelector("#endDate"),
  morningCutoff: document.querySelector("#morningCutoff"),
  leaderName: document.querySelector("#leaderName"),
  leaderDetail: document.querySelector("#leaderDetail"),
  playerCards: document.querySelector("#playerCards"),
  todayLabel: document.querySelector("#todayLabel"),
  todayControls: document.querySelector("#todayControls"),
  rangeLabel: document.querySelector("#rangeLabel"),
  calendar: document.querySelector("#calendar"),
  toast: document.querySelector("#toast")
};

function isFirebaseConfigured() {
  return firebaseConfig?.apiKey && !firebaseConfig.apiKey.includes("PEGA_AQUI") && firebaseConfig.projectId && !firebaseConfig.projectId.includes("PEGA_AQUI");
}

function generateLeagueId() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(36).padStart(2, "0")).join("").slice(0, 20);
}

function getLeagueIdFromUrl() {
  const url = new URL(window.location.href);
  const existing = url.searchParams.get("liga");
  if (existing && /^[a-zA-Z0-9_-]{12,80}$/.test(existing)) return existing;

  const fallback = EFFECTIVE_OPTIONS.defaultLeagueId || generateLeagueId();
  url.searchParams.set("liga", fallback);
  window.history.replaceState({}, "", url.toString());
  return fallback;
}

function parseDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function prettyDate(dateString) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(parseDate(dateString));
}

function shortDate(dateString) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(parseDate(dateString));
}

function getDatesInRange(start, end) {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  const dates = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(formatDate(d));
  }
  return dates;
}

function groupByWeek(dates) {
  return dates.reduce((groups, dateString) => {
    const date = parseDate(dateString);
    const monday = new Date(date);
    const day = monday.getDay() || 7;
    monday.setDate(monday.getDate() - day + 1);
    const key = formatDate(monday);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(dateString);
    return groups;
  }, new Map());
}

function getDayData(dateString) {
  return state.days.get(dateString) || { date: dateString, players: {} };
}

function getSessionValue(dateString, playerId, session) {
  const day = getDayData(dateString);
  return Boolean(day.players?.[playerId]?.[session]);
}

function calculateStats() {
  const dates = getDatesInRange(state.settings.startDate, state.settings.endDate);
  const stats = Object.fromEntries(state.settings.players.map(player => [player.id, {
    id: player.id,
    name: player.name,
    total: 0,
    morning: 0,
    afternoon: 0,
    beachDays: 0
  }]));

  for (const date of dates) {
    for (const player of state.settings.players) {
      const morning = getSessionValue(date, player.id, "morning");
      const afternoon = getSessionValue(date, player.id, "afternoon");
      if (morning) stats[player.id].morning += 1;
      if (afternoon) stats[player.id].afternoon += 1;
      if (morning || afternoon) stats[player.id].beachDays += 1;
      stats[player.id].total += Number(morning) + Number(afternoon);
    }
  }

  return Object.values(stats);
}

function renderScoreboard() {
  const stats = calculateStats();
  const sorted = [...stats].sort((a, b) => b.total - a.total);
  const [first, second] = sorted;

  if (!first || first.total === 0 && second?.total === 0) {
    els.leaderName.textContent = "Empate";
    els.leaderDetail.textContent = "Todavía no hay puntos registrados.";
  } else if (second && first.total === second.total) {
    els.leaderName.textContent = "Empate";
    els.leaderDetail.textContent = `${first.total} puntos cada uno.`;
  } else {
    const diff = second ? first.total - second.total : first.total;
    els.leaderName.textContent = first.name;
    els.leaderDetail.textContent = `${first.total} puntos · ventaja de ${diff}.`;
  }

  els.playerCards.innerHTML = stats.map(player => `
    <article class="player-card">
      <h3>${escapeHtml(player.name)} <span class="score">${player.total}</span></h3>
      <div class="stat-grid">
        <div class="stat"><span>Mañanas</span><strong>${player.morning}</strong></div>
        <div class="stat"><span>Tardes</span><strong>${player.afternoon}</strong></div>
        <div class="stat"><span>Días</span><strong>${player.beachDays}</strong></div>
      </div>
    </article>
  `).join("");
}

function renderTodayControls() {
  const today = formatDate(new Date());
  const dates = getDatesInRange(state.settings.startDate, state.settings.endDate);
  const dateForControls = dates.includes(today) ? today : state.settings.startDate;

  els.todayLabel.textContent = dates.includes(today)
    ? `Hoy es ${prettyDate(today)}.`
    : `Hoy queda fuera del rango. Muestro ${prettyDate(dateForControls)}.`;

  els.todayControls.innerHTML = state.settings.players.flatMap(player => ([
    makeToggleHtml(dateForControls, player, "morning", "Mañana"),
    makeToggleHtml(dateForControls, player, "afternoon", "Tarde")
  ])).join("");
}

function makeToggleHtml(dateString, player, session, label) {
  const checked = getSessionValue(dateString, player.id, session);
  const emoji = session === "morning" ? "☀️" : "🌅";
  return `
    <label class="session-toggle ${checked ? "active" : ""}" data-date="${dateString}" data-player="${player.id}" data-session="${session}">
      <input type="checkbox" ${checked ? "checked" : ""} />
      <span>${emoji} ${escapeHtml(player.name)} · ${label}</span>
    </label>
  `;
}

function renderCalendar() {
  const { startDate, endDate, morningCutoff } = state.settings;
  const dates = getDatesInRange(startDate, endDate);
  const weeks = groupByWeek(dates);

  els.rangeLabel.textContent = `${prettyDate(startDate)} – ${prettyDate(endDate)} · mañana hasta las ${morningCutoff}`;

  els.calendar.innerHTML = Array.from(weeks.entries()).map(([weekStart, weekDates]) => `
    <div class="week-block">
      <div class="week-title">Semana del ${prettyDate(weekStart)}</div>
      ${weekDates.map(dateString => `
        <div class="day-row">
          <div class="day-cell">
            <strong>${capitalize(shortDate(dateString))}</strong>
            <span>${dateString}</span>
          </div>
          ${state.settings.players.map(player => `
            <div class="player-day-cell">
              <span class="player-name-chip">${escapeHtml(player.name)}</span>
              ${makeToggleHtml(dateString, player, "morning", "Mañana")}
              ${makeToggleHtml(dateString, player, "afternoon", "Tarde")}
            </div>
          `).join("")}
        </div>
      `).join("")}
    </div>
  `).join("");
}

function renderAll() {
  renderScoreboard();
  renderTodayControls();
  renderCalendar();
}

function bindEvents() {
  document.body.addEventListener("change", async (event) => {
    const toggle = event.target.closest(".session-toggle");
    if (!toggle) return;

    const { date, player, session } = toggle.dataset;
    const value = event.target.checked;
    await saveSession(date, player, session, value);
    toggle.classList.toggle("active", value);
  });

  els.copyLinkBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(window.location.href);
    showToast("Enlace copiado. Pásaselo solo a quien vaya a editar la liga.");
  });

  els.exportBtn.addEventListener("click", exportCsv);

  els.settingsBtn.addEventListener("click", () => {
    const [p1, p2] = state.settings.players;
    els.playerOneName.value = p1?.name || "María";
    els.playerTwoName.value = p2?.name || "Pablo";
    els.startDate.value = state.settings.startDate;
    els.endDate.value = state.settings.endDate;
    els.morningCutoff.value = state.settings.morningCutoff;
    els.settingsDialog.showModal();
  });

  els.cancelSettingsBtn.addEventListener("click", () => els.settingsDialog.close());

  els.settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const updatedSettings = {
      startDate: els.startDate.value,
      endDate: els.endDate.value,
      morningCutoff: els.morningCutoff.value || "13:00",
      players: [
        { id: "maria", name: cleanName(els.playerOneName.value, "María") },
        { id: "amigo", name: cleanName(els.playerTwoName.value, "Pablo") }
      ]
    };

    if (parseDate(updatedSettings.endDate) < parseDate(updatedSettings.startDate)) {
      showToast("La fecha final no puede ser anterior al inicio.");
      return;
    }

    await saveSettings(updatedSettings);
    els.settingsDialog.close();
    showToast("Ajustes guardados.");
  });
}

async function init() {
  state.leagueId = getLeagueIdFromUrl();
  bindEvents();

  if (!isFirebaseConfigured()) {
    state.usingLocalMode = true;
    els.setupWarning.classList.remove("hidden");
    els.setupWarning.innerHTML = "Estás en modo demo local porque falta configurar Firebase. Lo que marques se guarda solo en este navegador. Para sincronizar entre los dos, pega tu configuración en <strong>firebase-config.js</strong> y publica la web.";
    loadLocalState();
    renderAll();
    return;
  }

  const app = initializeApp(firebaseConfig);
  state.db = getFirestore(app);
  await ensureCompetitionExists();
  subscribeToCompetition();
}

async function ensureCompetitionExists() {
  const ref = doc(state.db, "competitions", state.leagueId);
  const snap = await getDoc(ref);

  const desiredSettings = {
    startDate: EFFECTIVE_OPTIONS.startDate,
    endDate: EFFECTIVE_OPTIONS.endDate,
    morningCutoff: EFFECTIVE_OPTIONS.morningCutoff,
    players: EFFECTIVE_OPTIONS.defaultPlayers
  };

  if (!snap.exists()) {
    await setDoc(ref, {
      ...desiredSettings,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return;
  }

  // Migración suave para la liga que ya estaba creada con "Amigo" y septiembre completo.
  // Así cambiar app.js sí actualiza también el documento ya guardado en Firebase.
  const data = snap.data();
  const needsMigration =
    data.startDate !== desiredSettings.startDate ||
    data.endDate !== desiredSettings.endDate ||
    data.players?.[1]?.name !== "Pablo";

  if (needsMigration) {
    await setDoc(ref, {
      ...desiredSettings,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}

function subscribeToCompetition() {
  const ref = doc(state.db, "competitions", state.leagueId);
  state.unsubscribeCompetition?.();
  state.unsubscribeCompetition = onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    state.settings = normalizeSettings(snap.data());
    subscribeToDaysForCurrentRange();
    renderAll();
  }, (error) => showToast(`Error leyendo ajustes: ${error.message}`));
}

function subscribeToDaysForCurrentRange() {
  state.dayUnsubscribers.forEach(unsubscribe => unsubscribe());
  state.dayUnsubscribers = [];
  state.days.clear();

  const dates = getDatesInRange(state.settings.startDate, state.settings.endDate);

  for (const dateString of dates) {
    const ref = doc(state.db, "competitions", state.leagueId, "days", dateString);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        state.days.set(dateString, snap.data());
      } else {
        state.days.delete(dateString);
      }
      renderAll();
    }, (error) => showToast(`Error leyendo el día ${dateString}: ${error.message}`));

    state.dayUnsubscribers.push(unsubscribe);
  }
}

async function saveSession(dateString, playerId, session, value) {
  if (state.usingLocalMode) {
    const current = getDayData(dateString);
    current.players = current.players || {};
    current.players[playerId] = current.players[playerId] || {};
    current.players[playerId][session] = value;
    state.days.set(dateString, current);
    saveLocalState();
    renderAll();
    return;
  }

  const ref = doc(state.db, "competitions", state.leagueId, "days", dateString);
  await setDoc(ref, {
    date: dateString,
    players: {
      [playerId]: {
        [session]: value
      }
    },
    updatedAt: serverTimestamp()
  }, { merge: true });
}

async function saveSettings(updatedSettings) {
  state.settings = normalizeSettings(updatedSettings);

  if (state.usingLocalMode) {
    saveLocalState();
    renderAll();
    return;
  }

  const ref = doc(state.db, "competitions", state.leagueId);
  await setDoc(ref, {
    ...state.settings,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

function normalizeSettings(data) {
  return {
    startDate: data.startDate || EFFECTIVE_OPTIONS.startDate,
    endDate: data.endDate || EFFECTIVE_OPTIONS.endDate,
    morningCutoff: data.morningCutoff || EFFECTIVE_OPTIONS.morningCutoff,
    players: Array.isArray(data.players) && data.players.length >= 2
      ? data.players.slice(0, 2).map((player, index) => ({
          id: index === 0 ? "maria" : "amigo",
          name: cleanName(player.name, index === 0 ? "María" : "Pablo")
        }))
      : EFFECTIVE_OPTIONS.defaultPlayers
  };
}

function loadLocalState() {
  const raw = localStorage.getItem(`playa-tracker:${state.leagueId}`);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.settings = normalizeSettings(parsed.settings || state.settings);
    state.days = new Map(Object.entries(parsed.days || {}));
  } catch {
    localStorage.removeItem(`playa-tracker:${state.leagueId}`);
  }
}

function saveLocalState() {
  localStorage.setItem(`playa-tracker:${state.leagueId}`, JSON.stringify({
    settings: state.settings,
    days: Object.fromEntries(state.days)
  }));
}

function exportCsv() {
  const dates = getDatesInRange(state.settings.startDate, state.settings.endDate);
  const header = ["fecha", ...state.settings.players.flatMap(player => [`${player.name}_manana`, `${player.name}_tarde`, `${player.name}_puntos`])];
  const rows = dates.map(date => {
    const values = state.settings.players.flatMap(player => {
      const morning = Number(getSessionValue(date, player.id, "morning"));
      const afternoon = Number(getSessionValue(date, player.id, "afternoon"));
      return [morning, afternoon, morning + afternoon];
    });
    return [date, ...values];
  });

  const csv = [header, ...rows]
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ranking-playero-${state.leagueId}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.setTimeout(() => els.toast.classList.remove("show"), 2800);
}

function cleanName(value, fallback) {
  const cleaned = String(value || "").trim().replace(/\s+/g, " ");
  return cleaned || fallback;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init().catch((error) => {
  console.error(error);
  els.setupWarning.classList.remove("hidden");
  els.setupWarning.textContent = `No se pudo iniciar la app: ${error.message}`;
});
