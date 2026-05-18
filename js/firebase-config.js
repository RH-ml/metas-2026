// ============================================================
// FIREBASE-CONFIG.JS — Configurações e Inicialização do SDK
// ============================================================

const firebaseConfig = {
  apiKey: atob("QUl6YVN5Q3Zrb1RtZjVWbGpIODlwWHpnZjhDaUlxQnFHX0RwVWxr"),
  authDomain: "metas-2026-92a92.firebaseapp.com",
  projectId: "metas-2026-92a92",
  storageBucket: "metas-2026-92a92.firebasestorage.app",
  messagingSenderId: "498748762929",
  appId: "1:498748762929:web:75ec62d3da0de789fade10",
  measurementId: "G-4TVTXX8NH7"
};

let db = null;
let storage = null;
let isFirebaseActive = false;

// Inicializa o Firebase apenas se o usuário tiver configurado as chaves reais
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "SUA_API_KEY") {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    storage = firebase.storage();
    isFirebaseActive = true;
    console.log("🔥 Firebase inicializado com sucesso!");
  } catch (error) {
    console.error("❌ Falha ao inicializar o Firebase:", error);
  }
} else {
  console.warn("⚠️ Firebase rodando em MODO LOCAL (Configure as chaves em js/firebase-config.js para ativar a nuvem).");
}
