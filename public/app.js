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

/// Listen for the button click
submitGuessButton.addEventListener("click", () => {
  console.log("Submit button clicked!");
  const guess = userInput.value.toLowerCase();
  if (guess.length === 5) {
      submitGuess(guess);
  } else {
      feedback.textContent = "Please enter a 5-letter word.";
  }
});

// Handle the guess submission
function submitGuess(guess) {
  console.log(`Guess submitted: ${guess}`);

  if (attempts < maxAttempts) {
      attempts++;
      let result = checkGuess(guess);
      console.log("Result:", result); 

      // Clear previous feedback
      feedback.innerHTML = '';

      // Display each letter in the result with the correct color
      result.forEach(letter => {
          const span = document.createElement('span');
          span.textContent = letter.char;
          span.style.color = letter.color;
          span.style.marginRight = "5px"; // Optional: add spacing between letters
          feedback.appendChild(span);
      });

      // Check for win condition or game over
      if (guess === targetWord) {
          feedback.textContent = "You win!";
      } else {
          if (attempts === maxAttempts) {
              feedback.textContent = `Game over! The word was: ${targetWord}`;
          } else {
              feedback.textContent += ` (Attempt ${attempts}/${maxAttempts})`;
          }
      }
  }
}

// Check the guess and return feedback with colors
function checkGuess(guess) {
  let result = [];
  let targetLetters = [...targetWord];
  let guessLetters = [...guess];

  // First pass: check for exact matches (green)
  guessLetters.forEach((letter, index) => {
      if (letter === targetLetters[index]) {
          result.push({ char: letter, color: 'green' });
          targetLetters[index] = null; // Mark the letter as used
          guessLetters[index] = null; // Avoid checking it again
      } else {
          result.push({ char: letter, color: 'gray' }); // Default to gray
      }
  });

  // Second pass: check for partial matches (orange)
  guessLetters.forEach((letter, index) => {
      if (letter && targetLetters.includes(letter)) {
          result[index] = { char: letter, color: 'orange' };
          targetLetters[targetLetters.indexOf(letter)] = null; // Mark the letter as used
      }
  });

  return result;
}
});