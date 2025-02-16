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
  const guessesContainer = document.getElementById("guesses-container"); // Get the guesses container


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

  // Submit the guess and display feedback
  function submitGuess(guess) {
      if (attempts < maxAttempts) {
          attempts++;
          const result = checkGuess(guess);

          // Log the result array
          console.log('Guess result:', result);

          // Create a new div for the current guess
          const guessDiv = document.createElement('div');
          guessDiv.classList.add('guess'); // Add a class for styling, if needed

          // Create and append span elements for feedback *to the guessDiv*
          result.forEach(letter => {
              const span = document.createElement('span');
              span.textContent = letter.char;

              // Add the appropriate class based on the color
              if (letter.color === 'green') {
                  span.classList.add('green');
              } else if (letter.color === 'orange') {
                  span.classList.add('orange');
              } else if (letter.color === 'gray') {
                  span.classList.add('gray');
              }

              // Append the span to the *guessDiv*
              guessDiv.appendChild(span);

              // Log each span
              console.log('Appended span:', span);
          });

          // Append the guessDiv to the *guessesContainer*
          guessesContainer.appendChild(guessDiv);


          // Log feedback area after appending
          console.log('Feedback after appending:', feedback.innerHTML);


          // If the guess is correct
          if (guess === targetWord) {
              feedback.textContent = "You win!";
          } else {
              //feedback.textContent += ` (Attempt ${attempts}/${maxAttempts})`; // REMOVE THIS - no longer needed
              if (attempts === maxAttempts) {
                  feedback.textContent = `Game over! The word was: ${targetWord}`;
              }
          }
      }
  }

  // Check the guess and return feedback
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
});