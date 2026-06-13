// 1) Crea un proyecto en Firebase.
// 2) Activa Firestore Database.
// 3) Añade una app web y copia aquí la configuración que te da Firebase.
// 4) Sube el proyecto a GitHub Pages.

export const firebaseConfig = {
    apiKey: "AIzaSyBuAeTWBnst8bROs7xi3MM6ZOfRR2wHIdc",
    authDomain: "playa-tracker-web.firebaseapp.com",
    projectId: "playa-tracker-web",
    storageBucket: "playa-tracker-web.firebasestorage.app",
    messagingSenderId: "548514812929",
    appId: "1:548514812929:web:b25bf0f7f034b16f1f5c00",
    measurementId: "G-BWM4QMLB3Q"
};

export const APP_OPTIONS = {
  defaultLeagueId: "",
  startDate: "2026-06-15",
  endDate: "2026-09-06",
  morningCutoff: "13:00",
  defaultPlayers: [
    { id: "maria", name: "María" },
    { id: "pablo", name: "Pablo" }
  ]
};
