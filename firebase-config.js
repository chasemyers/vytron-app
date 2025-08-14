<!-- FILE: firebase-config.js -->
// Public client config (safe to expose for Firebase client apps)
const firebaseConfig = {
  apiKey: "AI...yourkey...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "##########",
  appId: "1:##########:web:##########"
};
// Initialize Firebase (Compat SDKs since your pages use <script> tags)
firebase.initializeApp(firebaseConfig);

// Expose helpers globally so page scripts can use them
window.auth = firebase.auth();
window.db = firebase.firestore();
window.storage = firebase.storage();

// Sign in (anonymous) so reads/writes work
auth.signInAnonymously().catch(console.error);
