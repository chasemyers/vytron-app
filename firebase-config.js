<!-- FILE: firebase-config.js -->
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAYA7OzOQBpyHsOYIDK89Z4-8BbrRleZ7A",
  authDomain: "vytron-maintenance-app.firebaseapp.com",
  projectId: "vytron-maintenance-app",
  storageBucket: "vytron-maintenance-app.firebasestorage.app",
  messagingSenderId: "951172681125",
  appId: "1:951172681125:web:278450c515a89547f32c4c",
  measurementId: "G-FEKBB1K6V7"
};
// Initialize Firebase (Compat SDKs since your pages use <script> tags)
firebase.initializeApp(firebaseConfig);

// Expose helpers globally so page scripts can use them
window.auth = firebase.auth();
window.db = firebase.firestore();
window.storage = firebase.storage();

// Sign in (anonymous) so reads/writes work
auth.signInAnonymously().catch(console.error);
