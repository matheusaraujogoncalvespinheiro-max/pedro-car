import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBi4__SqRGpcErIsHFTmSwA6MDcdcxDAro",
  authDomain: "pedro-car.firebaseapp.com",
  projectId: "pedro-car",
  storageBucket: "pedro-car.firebasestorage.app",
  messagingSenderId: "959483898229",
  appId: "1:959483898229:web:f6b0f3d957ba140bcbcb3c",
  measurementId: "G-ZBQNMDVBTF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
