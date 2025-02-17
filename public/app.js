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

  // Game setup (moved outside of any function for persistence)
  let targetWord = "apple"; // Default target word
  let attempts = 0;
  const maxAttempts = 6;

  // DOM elements for auth
  const signInButton = document.getElementById('sign-in-button');
  const signOutButton = document.getElementById('sign-out-button');
  const userInfoDiv = document.getElementById('user-info');
  const userPhotoImg = document.getElementById('user-photo');
  const userNameSpan = document.getElementById('user-name');

  // DOM elements for game
  const userInput = document.getElementById("user-input");
  const submitGuessButton = document.getElementById("submit-guess");
  const feedback = document.getElementById("feedback");
  const guessesContainer = document.getElementById("guesses-container");
  const gameContainer = document.getElementById("game-container");
  const restartButton = document.getElementById("restart-button"); // Get restart button


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

  // Listen for Auth State Changes (and manage game/input visibility)
  auth.onAuthStateChanged((user) => {
      if (user) {
          // User is signed in.
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

          // ENABLE INPUT AND BUTTON
          userInput.disabled = false;
          submitGuessButton.disabled = false;
          restartButton.style.display = "block"; //show restart

          // Restart the game when a user signs in
          restartGame();


      } else {
          // User is signed out.
          userInfoDiv.style.display = 'none';
          signOutButton.style.display = 'none';
          signInButton.style.display = 'block';
          userPhotoImg.style.display = 'none';
          userNameSpan.textContent = '';
          gameContainer.style.display = 'none';

          // DISABLE INPUT AND BUTTON
          userInput.disabled = true;
          submitGuessButton.disabled = true;
           restartButton.style.display = "none"; //hide restart

      }
  });

    // --- Restart Game Function ---
  function restartGame() {
      attempts = 0;                      // Reset attempts
      userInput.value = "";              // Clear input field
      feedback.textContent = "";          // Clear feedback
      guessesContainer.innerHTML = "";   // Clear previous guesses
      userInput.disabled = false;       // Re-enable input
      submitGuessButton.disabled = false; // Re-enable button

      // Get a *new* random word (if you want a new word each time)
      //  targetWord = getRandomWord(); // You'd need a function to do this
  }

  //Restart Button
  restartButton.addEventListener('click', restartGame);


  // --- Game Logic ---

  // Disable input/button on initial load
  userInput.disabled = true;
  submitGuessButton.disabled = true;
  restartButton.style.display = "none";


  submitGuessButton.addEventListener("click", async () => { // Make the handler async
    const guess = userInput.value.toLowerCase();
    if (guess.length === 5) {
        const valid = await isValidWord(guess); // Await the API call
        if (valid) {
            submitGuess(guess);
        } else {
            feedback.textContent = "Not a valid word.";
            userInput.value = ""; //clear input
        }
    } else {
        feedback.textContent = "Please enter a 5-letter word.";
         userInput.value = ""; //clear input
    }
  });

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
        
          // Clear the input field *after* processing the guess
          userInput.value = "";

          if (guess === targetWord) {
              feedback.textContent = "You win!";
              endGame();
              saveGameResults(true);
          } else if (attempts === maxAttempts) {
              feedback.textContent = `Game over! The word was: ${targetWord}`;
              endGame();
              saveGameResults(false);
          }
      }
  }

  function checkGuess(guess) {
    let result = [];
    let targetLetters = [...targetWord];
    let guessLetters = [...guess];

    // First pass: check for exact matches (green)
    guessLetters.forEach((letter, index) => {
        if (letter === targetLetters[index]) {
            result.push({ char: letter.toUpperCase(), color: 'green' });
            targetLetters[index] = null; // Mark the letter as used
            guessLetters[index] = null; // Avoid checking it again
        } else {
            result.push({ char: letter.toUpperCase(), color: 'gray' }); // Default to gray
        }
    });

    // Second pass: check for partial matches (orange)
    guessLetters.forEach((letter, index) => {
        if (letter && targetLetters.includes(letter)) {
            result[index] = { char: letter.toUpperCase(), color: 'orange' };
            targetLetters[targetLetters.indexOf(letter)] = null; // Mark as used
        }
    });

    return result;
}

  function endGame() {
      userInput.disabled = true;
      submitGuessButton.disabled = true;
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

  async function isValidWord(word) {
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (response.ok) { // 200 OK
            const data = await response.json();
            // The API returns an array.  If the word exists, the array
            // will have at least one element.
            return data.length > 0;
        } else if (response.status === 404) { // Word not found
            return false;
        } else {
            console.error("Dictionary API error:", response.status);
            return false; // Treat API errors as invalid words (for simplicity)
        }
    } catch (error) {
        console.error("Network error:", error);
        return false; // Treat network errors as invalid
    }
  }
});