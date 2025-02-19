document.addEventListener("DOMContentLoaded", () => {
  console.log("🔥 Initializing Firebase...");

// Firebase configuration
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
  const db = firebase.firestore();
  const auth = firebase.auth();
  console.log("✅ Firebase Initialized");

  // Game setup
  let targetWord = "apple"; // Default
  let attempts = 0;
  const maxAttempts = 6;

  // DOM elements
  const signInButton = document.getElementById('sign-in-button');
  const signOutButton = document.getElementById('sign-out-button');
  const userInfoDiv = document.getElementById('user-info-sidebar');
  const userPhotoImg = document.getElementById('user-photo-sidebar');
  const userNameSpan = document.getElementById('user-name-sidebar');
  const userInput = document.getElementById("user-input");
  const submitGuessButton = document.getElementById("submit-guess");
  const feedback = document.getElementById("feedback");
  const guessesContainer = document.getElementById("guesses-container");
  const gameContainer = document.getElementById("game-container");
  const restartButton = document.getElementById("restart-button");
  const sidebar = document.getElementById('sidebar');

  // --- Google Authentication Setup ---

  const provider = new firebase.auth.GoogleAuthProvider();

  signInButton.addEventListener('click', () => {
      auth.signInWithPopup(provider)
          .then((result) => {
              console.log("User signed in");
          })
          .catch((error) => {
              console.error("Error signing in:", error);
          });
  });

  signOutButton.addEventListener('click', () => {
      auth.signOut()
          .then(() => {
              console.log("Signed out");
          })
          .catch((error) => {
              console.error("Error signing out:", error);
          });
  });

  // Listen for Auth State Changes
  auth.onAuthStateChanged((user) => {
      if (user) {
          userNameSpan.textContent = user.displayName;

          if (user.photoURL) {
              userPhotoImg.src = user.photoURL;
              userPhotoImg.style.display = 'inline';
          } else {
              userPhotoImg.style.display = 'none';
          }

          userInfoDiv.style.display = 'block';
          signOutButton.style.display = 'block';
          signInButton.style.display = 'none';
          gameContainer.style.display = 'block';
          restartButton.style.display = "block";

          userInput.disabled = false;
          submitGuessButton.disabled = false;
          restartGame();

      } else {
          userInfoDiv.style.display = 'none';
          signOutButton.style.display = 'none';
          signInButton.style.display = 'block';
          userPhotoImg.style.display = 'none';
          userNameSpan.textContent = '';
          gameContainer.style.display = 'none';

          userInput.disabled = true;
          submitGuessButton.disabled = true;
          restartButton.style.display = "none";
      }
  });

   //Open close sidebar
  userPhotoImg.addEventListener("click", () => {
      sidebar.classList.toggle("open")
  })

  // --- Restart Game Function ---
  function restartGame() {
      attempts = 0;
      userInput.value = "";
      feedback.textContent = "";
      guessesContainer.innerHTML = "";
      userInput.disabled = false;
      submitGuessButton.disabled = false;
      // targetWord = getRandomWord(); // Optional
  }

  restartButton.addEventListener('click', restartGame);

  // --- Game Logic ---
  userInput.disabled = true;
  submitGuessButton.disabled = true;
  restartButton.style.display = "none";

  submitGuessButton.addEventListener("click", async () => {
      submitGuessButton.disabled = true; // Disable immediately
      const guess = userInput.value.toLowerCase();

      if (guess.length !== 5) {
          feedback.textContent = "Please enter a 5-letter word.";
          userInput.value = "";
          submitGuessButton.disabled = false; // Re-enable
          return;
      }

      if (!(await isValidWord(guess))) {
          feedback.textContent = "Not a valid word.";
          userInput.value = "";
          submitGuessButton.disabled = false; // Re-enable
          return;
      }

      submitGuess(guess); // No need to await, handled inside
  });

  async function isValidWord(word) {
      try {
          const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
          if (response.ok) {
              return (await response.json()).length > 0;
          } else if (response.status === 404) {
              return false;
          } else {
              console.error("Dictionary API error:", response.status);
              feedback.textContent = "Dictionary API error.  Try again.";
              return false;
          }
      } catch (error) {
          console.error("Network error:", error);
          feedback.textContent = "Network error. Check connection.";
          return false;
      }
  }

  function submitGuess(guess) {
      if (attempts < maxAttempts) {
          attempts++;
          const result = checkGuess(guess);

          const guessDiv = document.createElement('div');
          guessDiv.classList.add('guess');

          result.forEach(letter => {
              const span = document.createElement('span');
              span.textContent = letter.char;
              span.classList.add(letter.color);
              guessDiv.appendChild(span);
          });

          guessesContainer.appendChild(guessDiv);
          userInput.value = "";

          if (guess === targetWord) {
              feedback.textContent = "You win!";
              endGame(); // disables input and button
              saveGameResults(true);
          } else if (attempts === maxAttempts) {
              feedback.textContent = `Game over! The word was: ${targetWord}`;
              endGame(); // disables input and button
              saveGameResults(false);
          } else {
              // *** Re-enable ONLY if game is NOT over ***
              submitGuessButton.disabled = false;
          }
      }
  }

 function checkGuess(guess) {
    let result = [];
    let targetLetters = [...targetWord.toLowerCase()]; // Convert to lowercase AND copy
    let guessLetters = [...guess.toLowerCase()];      // Convert to lowercase AND copy

    // First pass: check for exact matches (green)
    for (let i = 0; i < guessLetters.length; i++) { //use a for loop
        if (guessLetters[i] === targetLetters[i]) {
            result.push({ char: guessLetters[i].toUpperCase(), color: 'green' }); //keep upper case in result
            targetLetters[i] = null;
            guessLetters[i] = null;
        }
    }

    // Default remaining letters to gray (only non-null letters)
      for (let i = 0; i < guessLetters.length; i++) { //use a for loop
        if (guessLetters[i] !== null) {
            result.push({ char: guessLetters[i].toUpperCase(), color: 'gray' });  //keep uppercase
        }
    }

    // Second pass: check for partial matches (orange)
      for (let i = 0; i < guessLetters.length; i++) { //use a for loop
        if (guessLetters[i] !== null && targetLetters.includes(guessLetters[i])) {
            const targetIndex = targetLetters.indexOf(guessLetters[i]);
            result[i] = { char: guessLetters[i].toUpperCase(), color: 'orange' }; // Keep uppercase
            targetLetters[targetIndex] = null;
        }
    }

    return result;
}

  function endGame() {
      userInput.disabled = true;
      submitGuessButton.disabled = true; // This is redundant now, but harmless
  }

  async function saveGameResults(isSuccessful) {
      const user = auth.currentUser;
      if (!user) {
          console.warn("No user signed in. Not saving results.");
          return;
      }

      const guesses = [];
      const guessDivs = document.querySelectorAll('#guesses-container .guess');
      guessDivs.forEach(guessDiv => {
        const guessLetters = [];
        const spans = guessDiv.querySelectorAll('span');
        spans.forEach(span => {
            const letter = span.textContent;
            let color = 'gray';
            if (span.classList.contains('green')) {
                color = 'green';
            } else if (span.classList.contains('orange')) {
                color = 'orange';
            }
            guessLetters.push({ char: letter, color: color });
        });
        const guessWord = guessLetters.map(l => l.char).join('');
        guesses.push({guess: guessWord, result: guessLetters});
    });

      const gameResult = {
          userId: user.uid,
          date: new Date().toISOString(),
          target: targetWord,
          turns: isSuccessful ? attempts : "failed",
          guesses: guesses,
      };

      try {
          const docRef = await db.collection('games').add(gameResult);
          console.log("Game results saved with ID:", docRef.id);
      } catch (error) {
          console.error("Error saving game results:", error);
      }
  }
});