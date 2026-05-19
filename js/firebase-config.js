// ============================================================
// FIREBASE-CONFIG.JS — Configurações e Inicialização do SDK
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyDaH6pLFnjqWfoRgILvO5vALhW9yJXw8aE",
  authDomain: "metas-2026-3340e.firebaseapp.com",
  projectId: "metas-2026-3340e",
  storageBucket: "metas-2026-3340e.firebasestorage.app",
  messagingSenderId: "1082387701257",
  appId: "1:1082387701257:web:95bd15ddd3356bdffee2d8",
  measurementId: "G-WJJ260SGYW"
};

let db = null;
let storage = null;
let isFirebaseActive = false;

// Inicializa o Firebase apenas se o usuário tiver configurado as chaves reais
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "SUA_API_KEY") {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    storage = firebase.storage();
    isFirebaseActive = true;
    console.log("🔥 Firebase inicializado com sucesso!");
  } catch (error) {
    console.error("❌ Falha ao inicializar o Firebase:", error);
  }
} else {
  console.warn("⚠️ Firebase rodando em MODO LOCAL (Configure as chaves em js/firebase-config.js para ativar a nuvem).");
}
