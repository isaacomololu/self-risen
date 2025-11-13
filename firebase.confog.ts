// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCMZYRiNwrmvxLrxxh82rAd4wxmFyQ06Ts",
  authDomain: "self-risen.firebaseapp.com",
  projectId: "self-risen",
  storageBucket: "self-risen.firebasestorage.app",
  messagingSenderId: "529280069289",
  appId: "1:529280069289:web:21d3ce40b77a51566cc3b8",
  measurementId: "G-8M7PF90TDE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);