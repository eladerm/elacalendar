// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "studio-3620711772-b2859",
  "appId": "1:904836381553:web:5da97a9fa9518c57f414d0",
  "apiKey": "AIzaSyDlB8mguRQNQ-SQZBryxVfjbjHySg4B56Q",
  "authDomain": "studio-3620711772-b2859.firebaseapp.com",
  "messagingSenderId": "904836381553",
};

// Initialize Firebase.
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
