document.addEventListener("DOMContentLoaded", () => {
    console.log("🔥 Initializing Firebase...");

    // Your Firebase configuration (replace with your own from Firebase Console)
    const firebaseConfig = {
        apiKey: "AIzaSyAF8N4oOo2Kv0W5rjO5Af8Dk15YwxR_p50",
        authDomain: "familywordle-c8402.firebaseapp.com",
        projectId: "familywordle-c8402",
        storageBucket: "familywordle-c8402.firebasestorage.app",
        messagingSenderId: "95103576558",
        appId: "1:95103576558:web:dc26e183b8b2f41b5fc6ff",
        measurementId: "G-C2NH8WDMEX"
      };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase Initialized");

// Game setup
const targetWord = "apple"; // The word to guess
let attempts = 0;
const maxAttempts = 6;

// DOM elements
const userInput = document.getElementById("user-input");
const submitGuessButton = document.getElementById("submit-guess");
const feedback = document.getElementById("feedback");

// Check if the elements exist
if (!userInput || !submitGuessButton || !feedback) {
    console.error("Missing DOM elements!");
    return;
}

// Handle guess submission
submitGuessButton.addEventListener("click", () => {
    const guess = userInput.value.toLowerCase();
    if (guess.length === 5) {
        submitGuess(guess);
    } else {
        feedback.textContent = "Please enter a 5-letter word.";
    }
});

// Submit a guess and check it
function submitGuess(guess) {
    if (attempts < maxAttempts) {
        attempts++;
        if (guess === targetWord) {
            feedback.textContent = "You win!";
        } else {
            if (attempts === maxAttempts) {
                feedback.textContent = `Game over! The word was: ${targetWord}`;
            } else {
                feedback.textContent = `Incorrect! You have ${maxAttempts - attempts} attempts left.`;
            }
        }
    }
}
});
