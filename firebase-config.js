// 1) Crea un proyecto en Firebase.
// 2) Activa Firestore Database.
// 3) Añade una app web y copia aquí la configuración que te da Firebase.
// 4) Sube el proyecto a GitHub Pages.

export const firebaseConfig = {
  apiKey: "PEGA_AQUI_TU_API_KEY",
  authDomain: "PEGA_AQUI.firebaseapp.com",
  projectId: "PEGA_AQUI",
  storageBucket: "PEGA_AQUI.appspot.com",
  messagingSenderId: "PEGA_AQUI",
  appId: "PEGA_AQUI"
};

export const APP_OPTIONS = {
  defaultLeagueId: "",
  startDate: "2026-06-15",
  endDate: "2026-09-30",
  morningCutoff: "13:00",
  defaultPlayers: [
    { id: "maria", name: "María" },
    { id: "amigo", name: "Amigo" }
  ]
};
