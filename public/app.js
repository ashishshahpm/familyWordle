document.addEventListener("DOMContentLoaded", () => {
  console.log("🔥 Initializing Firebase...");

  // Your Firebase configuration
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
  const targetWord = "apple";
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
  const gameContainer = document.getElementById("game-container"); // Get the game container

  // --- Google Authentication Setup ---

  const provider = new firebase.auth.GoogleAuthProvider();

  signInButton.addEventListener('click', () => {
      auth.signInWithPopup(provider)
          .then((result) => {
              // User is signed in (UI updates are handled in onAuthStateChanged)
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
              // UI updates are handled in onAuthStateChanged
          })
          .catch((error) => {
              console.error("Error signing out:", error);
          });
  });

  // Listen for Auth State Changes (and manage game visibility)
  auth.onAuthStateChanged((user) => {
      if (user) {
          // User is signed in.
          console.log("Auth state changed, user:", user);
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
          gameContainer.style.display = 'block'; // Show the game

          // *** ENABLE INPUT AND BUTTON ***
          userInput.disabled = false;
          submitGuessButton.disabled = false;

      } else {
          // User is signed out.
          console.log("User is signed out");
          userInfoDiv.style.display = 'none';
          signOutButton.style.display = 'none';
          signInButton.style.display = 'block';
          userPhotoImg.style.display = 'none';
          userNameSpan.textContent = '';
          gameContainer.style.display = 'none'; // Hide the game

          // *** DISABLE INPUT AND BUTTON ***
          userInput.disabled = true;
          submitGuessButton.disabled = true;
      }
  });


  // --- Game Logic ---

  // Disable the game initially (this is now redundant, but harmless)
  userInput.disabled = true;
  submitGuessButton.disabled = true;


  submitGuessButton.addEventListener("click", () => {
      const guess = userInput.value.toLowerCase();
      if (guess.length === 5) {
          submitGuess(guess);
      } else {
          feedback.textContent = "Please enter a 5-letter word.";
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

          if (guess === targetWord) {
              feedback.textContent = "You win!";
              saveGameResults(true);
          } else {
              if (attempts === maxAttempts) {
                  feedback.textContent = `Game over! The word was: ${targetWord}`;
                  saveGameResults(false);
              }
          }
      }
  }

  function checkGuess(guess) {
      let result = [];
      let targetLetters = [...targetWord];
      let guessLetters = [...guess];

      guessLetters.forEach((letter, index) => {
          if (letter === targetLetters[index]) {
              result.push({ char: letter.toUpperCase(), color: 'green' });
              targetLetters[index] = null;
              guessLetters[index] = null;
          } else {
              result.push({ char: letter.toUpperCase(), color: 'gray' });
          }
      });
      guessLetters.forEach((letter, index) => {
          if (letter && targetLetters.includes(letter)) {
              result[index] = { char: letter.toUpperCase(), color: 'orange' };
              targetLetters[targetLetters.indexOf(letter)] = null;
          }
      });
      return result;
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
          // Get all spans within the current guess div
          const spans = guessDiv.querySelectorAll('span');
          spans.forEach(span => {
              // Extract the letter and its color class
              const letter = span.textContent;
              let color = 'gray'; // Default to gray
              if (span.classList.contains('green')) {
                  color = 'green';
              } else if (span.classList.contains('orange')) {
                  color = 'orange';
              }
              guessLetters.push({ char: letter, color: color });
          });
              // reconstruct the guess word string
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

      console.log(gameResult)

      try {
          const docRef = await db.collection('games').add(gameResult);
          console.log("Game results saved with ID:", docRef.id);
      } catch (error) {
          console.error("Error saving game results:", error);
      }
  }
});