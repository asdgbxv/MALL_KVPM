const firebaseConfig = {
  apiKey: "AIzaSyCoBnrD4f59V6itglOYnHu37SbkGAQkZpQ",
  authDomain: "xxxx-85418.firebaseapp.com",
  databaseURL: "https://xxxx-85418-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "xxxx-85418",
  storageBucket: "xxxx-85418.appspot.com",
  messagingSenderId: "574538814938",
  appId: "1:574538814938:web:1fd4a22fcfe526baa65ce3",
  measurementId: "G-93W2CH1YD1"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Set up Firestore and Storage
const db = firebase.firestore();
const storage = firebase.storage();
