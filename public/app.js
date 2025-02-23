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
    let targetWord = "apple"; // Default, will be overwritten
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
    const scoresButton = document.getElementById('scores-button');
    const scoresContainer = document.getElementById('scores-container');
    const scoresList = document.getElementById('scores-list'); //NEW
     const closeScoresButton = document.getElementById('close-scores-button');


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
            scoresButton.style.display = "block"; // Show scores button


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
            scoresButton.style.display = "none"; // Hide scores button
            scoresContainer.style.display = 'none'; // Ensure scores are hidden

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
        scoresContainer.style.display = 'none';
        targetWord = getWordOfTheDay(); // Use the new function!
        gameContainer.style.display = 'block';
    }


    restartButton.addEventListener('click', restartGame);

      // --- Show Scores Function ---
    scoresButton.addEventListener('click', () => {
      displayScores(); // Call the function to fetch and display
      gameContainer.style.display = 'none'; //hide game
      scoresContainer.style.display = 'block'; // Show the scores container

    });

    closeScoresButton.addEventListener('click', () => {
        scoresContainer.style.display = 'none';
        gameContainer.style.display = "block";
    })


    // --- Game Logic ---
    userInput.disabled = true;
    submitGuessButton.disabled = true;
    restartButton.style.display = "none";
    scoresButton.style.display = "none";

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
                endGame();
                saveGameResults(true);
            } else if (attempts === maxAttempts) {
                feedback.textContent = `Game over! The word was: ${targetWord}`;
                endGame();
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
              result.push({ char: guessLetters[i].toUpperCase(), color: 'green' }); //UPPERCASE HERE
              targetLetters[i] = null;
              guessLetters[i] = null;
          }
      }

      // Default remaining letters to gray (only non-null letters)
        for (let i = 0; i < guessLetters.length; i++) { //use a for loop
          if (guessLetters[i] !== null) {
              result.push({ char: guessLetters[i].toUpperCase(), color: 'gray' });  //UPPERCASE HERE
          }
      }

      // Second pass: check for partial matches (orange)
        for (let i = 0; i < guessLetters.length; i++) { //use a for loop
          if (guessLetters[i] !== null && targetLetters.includes(guessLetters[i])) {
              const targetIndex = targetLetters.indexOf(guessLetters[i]);
              result[i] = { char: guessLetters[i].toUpperCase(), color: 'orange' }; // UPPERCASE HERE
              targetLetters[targetIndex] = null;
          }
      }

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

    async function displayScores() {
    const user = auth.currentUser;
    if (!user) {
        console.warn("No user signed in. Cannot display scores.");
        scoresList.innerHTML = '<li>Please sign in to view scores.</li>'; // User-friendly message, and proper innerHTML use
        return;
    }

    // Clear any previous histogram
        const histogramContainer = document.getElementById('histogram');
        histogramContainer.innerHTML = '';


    try {
        const querySnapshot = await db.collection('games')
            .where('userId', '==', user.uid)
            .orderBy('date', 'desc')  //Keep ordering
            // .limit(5)  Remove limit
            .get();

        if (querySnapshot.empty) {
            histogramContainer.innerHTML = '<p>No scores found.</p>';
            return;
        }

        // Aggregate the data for the histogram
        const turnCounts = {
            1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 'failed': 0
        };

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const turns = data.turns; // Could be a number (1-6) or "failed"
            if (turnCounts.hasOwnProperty(turns)) {
                turnCounts[turns]++;
            }
        });

        console.log("Turn Counts:", turnCounts);

        // Find the maximum count for scaling the bars
        let maxCount = 0;
        for (const count of Object.values(turnCounts)) {
            if (count > maxCount) {
                maxCount = count;
            }
        }

        // Create the histogram bars
        for (let i = 1; i <= 6; i++) {
            const barHeight = maxCount === 0 ? 0 : (turnCounts[i] / maxCount) * 100; // Calculate height as percentage
            const bar = document.createElement('div');
            bar.classList.add('bar');
            bar.style.height = `${barHeight}%`;
            bar.setAttribute('data-turns', i); // Add data attribute for turns
             // Add label
            const barLabel = document.createElement('span');
            barLabel.classList.add("bar-label");
            barLabel.textContent = turnCounts[i] > 0 ? turnCounts[i] : ""; // Only if > 0
            bar.appendChild(barLabel);

            histogramContainer.appendChild(bar);
        }
        //add bar for fail
        const failBarHeight = maxCount === 0 ? 0 : (turnCounts['failed'] / maxCount) * 100;
        const failBar = document.createElement('div');
        failBar.classList.add('bar');
        failBar.style.height = `${failBarHeight}%`;
        failBar.setAttribute('data-turns', 'failed');

        const failBarLabel = document.createElement('span');
        failBarLabel.classList.add("bar-label");
        failBarLabel.textContent = turnCounts['failed'] > 0 ? turnCounts['failed'] : "";
        failBar.appendChild(failBarLabel);

        histogramContainer.appendChild(failBar);


    } catch (error) {
        console.error("Error fetching scores:", error);
        histogramContainer.innerHTML = '<p>Error loading scores.</p>';
    }
}
    //Add this function
      function getRandomWord() {
        const words = ["apple", "crane", "space", "table", "blimp", "grape", "music", "jumbo", "light", "house",
    "train", "plane", "beach", "cloud", "bread", "water", "chair", "shirt", "pants", "shoes"]; //Your words here
        const randomIndex = Math.floor(Math.random() * words.length);
        return words[randomIndex];
    }

     function mulberry32(a) {
        return function() {
          a |= 0; a = a + 0x6D2B79F5 | 0;
          let t = Math.imul(a ^ a >>> 15, 1 | a);
          t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
          return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
    }

    function getWordOfTheDay() {
        const now = new Date();
        const gmtDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000)); // Get date in GMT
        const year = gmtDate.getUTCFullYear();
        const month = gmtDate.getUTCMonth();
        const day = gmtDate.getUTCDate();

        // Create a seed from the date (YYYYMMDD)
        const seed = year * 10000 + (month + 1) * 100 + day;
        const rng = mulberry32(seed); // Create a seeded PRNG

        const words = ["apple", "crane", "space", "table", "blimp", "grape", "music", "jumbo", "light", "house",
        "train", "plane", "beach", "cloud", "bread", "water", "chair", "shirt", "pants", "shoes"]; //Your words here

        // Generate a pseudorandom index based on the seed
        const randomIndex = Math.floor(rng() * words.length);
        return words[randomIndex];
    }
});