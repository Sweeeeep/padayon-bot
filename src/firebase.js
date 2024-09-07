// Import the functions you need from the SDKs you need
const { initializeApp } = require("firebase/app");

const { getFirestore, doc, setDoc, collection, addDoc, getDoc, query, where, getDocs } = require("firebase/firestore");
const { getAnalytics } =  require("firebase/analytics");


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA2nTKyvA5wWefKlWU_1BjKsazleFCCgJk",
  authDomain: "nc-discordbot.firebaseapp.com",
  projectId: "nc-discordbot",
  storageBucket: "nc-discordbot.appspot.com",
  messagingSenderId: "844871454589",
  appId: "1:844871454589:web:bda94cbafe6d07da834614",
  measurementId: "G-ZY8G6LKFZG"
};

// Initialize Firebase
let app;
let firestoreDB;

const InitializeFirebaseApp = () => {
    try{
        app = initializeApp(firebaseConfig);
        firestoreDB = getFirestore()
        return app;
    } catch (error) {
        console.error(error)
    }
}

const storeData = async (type, location, time, user, callback) => {
    const dataToUpload = {
        'boss-type': type,
        location: location,
        time: time,
        user: user,
        created_at: Math.floor(Date.now() / 1000)
    };

    try {
        // Reference to the collection
        const colRef = collection(firestoreDB, 'boss-record');
    
        // Create a query to check for existing documents with the same 'boss-type', 'location', and 'time'
        const querySnapshot = await getDocs(query(
            colRef, 
            where('boss-type', '==', dataToUpload['boss-type']), 
            where('location', '==', dataToUpload.location),
            where('time', '==', dataToUpload.time)
        ));
    
        if (!querySnapshot.empty) {
            console.log('Document with the same boss-type, location, and time already exists.');
            callback(false, querySnapshot.docs[0].data())
            return;
        }
    
        // Use addDoc to add a document with an auto-generated ID if no matching document is found
        const docRef = await addDoc(colRef, dataToUpload);
        console.log('Document written with ID: ', docRef.id);

        const docSnapshop = await getDoc(docRef);
        callback(true, docSnapshop.data());
        return;

    } catch (error) {
        console.error('Error adding document: ', error);
    }
    // try{
        
    //     const collRef = doc(firestoreDB, "boss-record");
    //     const docRef = await addDoc(document, dataToUpload);
    //     return data;
    // } catch (error){
    //     console.log(error)
    // }
}

const getFirebaseApp = () => app;

module.exports = {
    InitializeFirebaseApp,
    getFirebaseApp,
    storeData
};
