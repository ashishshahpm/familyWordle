document.addEventListener("DOMContentLoaded", () => {
    console.log("🔥 Initializing Firebase...");

    // Firebase configuration (REPLACE WITH YOUR ACTUAL CONFIG)
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
let currentRow = 0;
let currentLetterIndex = 0;

// DOM elements
const signInButton = document.getElementById('sign-in-button');
const signOutButton = document.getElementById('sign-out-button');
const userInfoDiv = document.getElementById('user-info-sidebar');
const userPhotoImg = document.getElementById('user-photo-sidebar');
const userNameSpan = document.getElementById('user-name-sidebar');
const feedback = document.getElementById("feedback");
const guessesContainer = document.getElementById("guesses-container");
const gameContainer = document.getElementById("game-container");
const restartButton = document.getElementById("restart-button");
const sidebar = document.getElementById('sidebar');
const scoresButton = document.getElementById('scores-button');
const scoresContainer = document.getElementById('scores-container');
const histogramContainer = document.getElementById('histogram');
const closeScoresButton = document.getElementById('close-scores-button');

let wordList = []; // Global to store word list

// --- Load Word List from Firestore ---
async function loadWordList() {
    try {
        const querySnapshot = await db.collection('words').get();
        wordList = querySnapshot.docs.map(doc => doc.data().word);
        console.log("Word list loaded:", wordList.length, "words");
        if (wordList.length === 0) {
            console.warn("Word list from Firestore is empty!");
            feedback.textContent = "Error: Word list is empty. Cannot start game.";
            disableGame();
        }
    } catch (error) {
        console.error("Could not load word list:", error);
        feedback.textContent = "Error: Could not load word list.";
        disableGame();
    }
}

function disableGame() {
    restartButton.disabled = true;
    //Also disable keyboard input
    document.removeEventListener('keydown', handleKeyDown);
}


// --- Google Authentication Setup ---
const provider = new firebase.auth.GoogleAuthProvider();

signInButton.addEventListener('click', () => {
    auth.signInWithPopup(provider);
});

signOutButton.addEventListener('click', () => {
    auth.signOut();
});

// --- Load word list, *then* create letter boxes and initialize the game ---
loadWordList().then(() => {
    // *After* word list is loaded:

    createLetterBoxes(); // Create boxes *before* auth state change

    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            userNameSpan.textContent = user.displayName;
            userPhotoImg.src = user.photoURL || ''; //Set src, handle null
            userPhotoImg.style.display = user.photoURL ? 'inline' : 'none';

            userInfoDiv.style.display = 'block';
            signOutButton.style.display = 'block';
            signInButton.style.display = 'none';
            gameContainer.style.display = 'block';
            restartButton.style.display = "block";
            scoresButton.style.display = "block";

            restartGame(); // Restart the game (sets targetWord, etc.)
            document.addEventListener('keydown', handleKeyDown); // Attach event listener

        } else {
            // User is signed out
            userInfoDiv.style.display = 'none';
            signOutButton.style.display = 'none';
            signInButton.style.display = 'block';
            userPhotoImg.style.display = 'none';
            userNameSpan.textContent = '';
            gameContainer.style.display = 'none';
            restartButton.style.display = "none";
            scoresButton.style.display = "none";
            scoresContainer.style.display = 'none';
            document.removeEventListener('keydown', handleKeyDown);
        }
    });
});


//Open close sidebar
userPhotoImg.addEventListener("click", () => {
    sidebar.classList.toggle("open")
})

// --- Restart Game Function ---
function restartGame() {
    attempts = 0;
    currentRow = 0; // Reset row
    currentLetterIndex = 0; // Reset letter index
    feedback.textContent = "";
    scoresContainer.style.display = 'none'; // Hide scores if restarting

    // Clear existing boxes and recreate them
    createLetterBoxes(); // Call this to recreate the boxes

    targetWord = getWordOfTheDay();
    gameContainer.style.display = 'block';
    console.log("target word is " + targetWord);
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

function createLetterBoxes() {
    console.log("createLetterBoxes called");
    guessesContainer.innerHTML = ''; // Clear any existing boxes
    for (let i = 0; i < maxAttempts; i++) {
        const row = document.createElement('div');
        row.classList.add('guess-row');
        row.id = `row-${i}`; // Add an ID for easy access
        for (let j = 0; j < 5; j++) {
            const box = document.createElement('div');
            box.classList.add('letter-box');
            row.appendChild(box);
        }
        guessesContainer.appendChild(row);
    }
}



// --- Helper function for keydown (to allow easy removal) ---
//We use this, so that we have something to remove, when we remove the event listener.
function handleKeyDown(event) {
    if (attempts >= maxAttempts) return; // Prevent input after game over
    if (sidebar.classList.contains('open')) return; //If sidebar is open, don't allow

    const key = event.key.toLowerCase();
    console.log("Key pressed:", key);

    if (key === 'enter') {
        submitGuess();
    } else if (key === 'backspace') {
        deleteLetter();
    } else if (/^[a-z]$/.test(key)) { // Check if it's a letter
        addLetter(key);
    }
}


function addLetter(letter) {
    console.log("addLetter called with:", letter);
    if (currentLetterIndex < 5) {
        const row = document.getElementById(`row-${currentRow}`);
        console.log("Current Row:", currentRow);
        if (!row) {
            console.error("Row not found:", currentRow); // CRITICAL ERROR CHECK
            return; // Exit if row not found
        }
        const boxes = row.querySelectorAll('.letter-box');
        console.log("Boxes found:", boxes.length);

        if (currentLetterIndex >= boxes.length) {
            console.error("currentLetterIndex out of bounds:", currentLetterIndex);
            return;
        }
        boxes[currentLetterIndex].textContent = letter.toUpperCase();
        currentLetterIndex++;
    }
}

function deleteLetter() {
    console.log("deleteLetter called");
    if (currentLetterIndex > 0) {
        currentLetterIndex--;
        const row = document.getElementById(`row-${currentRow}`);
        if (!row) {
            console.error("Row not found:", currentRow); // CRITICAL ERROR CHECK
            return; // Exit if row not found
        }
        const boxes = row.querySelectorAll('.letter-box');
        if (currentLetterIndex >= boxes.length) { // Prevent out-of-bounds access
            console.error("currentLetterIndex out of bounds:", currentLetterIndex);
            return;
        }
        boxes[currentLetterIndex].textContent = '';
    }
}

// --- Submit Guess (Modified) ---
async function submitGuess() {
    console.log("submitGuess called");
    if (currentLetterIndex !== 5) {
        feedback.textContent = "Enter a 5-letter word.";
        return;
    }

    const row = document.getElementById(`row-${currentRow}`);
    const boxes = row.querySelectorAll('.letter-box');
    let guess = '';
    boxes.forEach(box => {
        guess += box.textContent.toLowerCase();
    });

    console.log("Submitting guess:", guess);

    // Check word validity *before* proceeding
    if (!(await isValidWord(guess))) {
        feedback.textContent = "Not a valid word.";
        return; // Exit early if invalid
    }


    const result = checkGuess(guess);
    console.log("Result:", JSON.stringify(result));

    // Apply colors
    result.forEach((letterInfo, index) => {
        boxes[index].classList.add(letterInfo.color);
    });

    attempts++; // Increment attempts *after* processing the guess
    if (guess === targetWord) {
        feedback.textContent = "You win!";
        saveGameResults(true);
        endGame();

    } else if (attempts === maxAttempts) {
        feedback.textContent = `Game over! The word was: ${targetWord}`;
        saveGameResults(false);
        endGame();

    } else {
        // Move to the next row
        currentRow++;
        currentLetterIndex = 0;
        feedback.textContent = ''; // Clear feedback
    }
}

async function isValidWord(word) {
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (response.ok) {
            const data = await response.json();
            // Check if the word exists AND has 5 letters.
            return data.length > 0 && word.length === 5 && /^[a-z]+$/.test(word);
        } else if (response.status === 404) {
            return false;
        } else {
            console.error("Dictionary API error:", response.status);
            feedback.textContent = "Dictionary API error. Please try again later.";
            return false;
        }
    } catch (error) {
        console.error("Network error:", error);
        feedback.textContent = "Network error. Please check your connection.";
        return false;
    }
}

function checkGuess(guess) {
    let result = [];
    let targetLetters = [...targetWord.toLowerCase()]; // Convert to lowercase AND copy
    let guessLetters = [...guess.toLowerCase()];      // Convert to lowercase AND copy
    console.log (`Guess is ${guess}`)
    console.log (`Target Word is ${targetWord}`)

    // First pass: check for exact matches (green)
    for (let i = 0; i < guessLetters.length; i++) { //use a for loop
        if (guessLetters[i] === targetLetters[i]) {
            result.push({ char: guessLetters[i].toUpperCase(), color: 'green' }); //UPPERCASE HERE
            targetLetters[i] = null;
            guessLetters[i] = null;
        }
        else {
            result.push({ char: guessLetters[i].toUpperCase(), color: 'gray' }); //UPPERCASE HERE
        }
    }

    /* Default remaining letters to gray (only non-null letters)
    for (let i = 0; i < guessLetters.length; i++) { //use a for loop
        if (guessLetters[i] !== null) {
            result.push({ char: guessLetters[i].toUpperCase(), color: 'gray' });  //UPPERCASE HERE
        }
    }*/

    console.log("First check Result:", JSON.stringify(result));


    // Second pass: check for partial matches (orange)
    for (let i = 0; i < guessLetters.length; i++) { //use a for loop
        if (guessLetters[i] !== null && targetLetters.includes(guessLetters[i])) {
            const targetIndex = targetLetters.indexOf(guessLetters[i]);
            result[i] = { char: guessLetters[i].toUpperCase(), color: 'orange' }; // UPPERCASE HERE
            targetLetters[targetIndex] = null;
        }
    }
    console.log("Second check Result:", JSON.stringify(result));

    return result;
}

function endGame() {
    //Game ends remove event listener.
    document.removeEventListener('keydown', handleKeyDown);
}

async function saveGameResults(isSuccessful) {
    const user = auth.currentUser;
    if (!user) {
        console.warn("No user signed in. Not saving results.");
        return;
    }

    const guesses = [];
    const guessDivs = document.querySelectorAll('#guesses-container .guess-row'); //get all rows
    guessDivs.forEach(guessDiv => {
        const guessLetters = [];
        const boxes = guessDiv.querySelectorAll('.letter-box'); //get all boxes
        boxes.forEach(box => {
            const letter = box.textContent;
            let color = 'gray';
            if (box.classList.contains('green')) {
                color = 'green';
            } else if (box.classList.contains('orange')) {
                color = 'orange';
            }
            guessLetters.push({ char: letter, color: color });
        });
        const guessWord = guessLetters.map(l => l.char).join('');
        guesses.push({guess: guessWord, result: guessLetters}); //store word and result
    });

    const gameResult = {
        userId: user.uid,
        date: new Date().toISOString(),
        target: targetWord,
        turns: isSuccessful ? attempts : "failed",
        guesses: guesses,
    };
    console.log(gameResult);

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
        histogramContainer.innerHTML = "<p>Please sign in to view scores.</p>";
        return;
    }

    histogramContainer.innerHTML = ''; // Clear previous histogram

    try {
        const querySnapshot = await db.collection('games')
            .where('userId', '==', user.uid)
            .orderBy('date', 'desc')
            .get();

        if (querySnapshot.empty) {
            histogramContainer.innerHTML = '<p>No scores found.</p>';
            return;
        }

        const turnCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 'failed': 0 };
        querySnapshot.forEach(doc => {
            const turns = doc.data().turns;
            if (turnCounts.hasOwnProperty(turns)) {
                turnCounts[turns]++;
            }
        });

        // Calculate maxCount *after* populating turnCounts
        let maxCount = Math.max(...Object.values(turnCounts));

         // Handle the case where maxCount is 0 (no games played)
        if (maxCount === 0) {
            histogramContainer.innerHTML = '<p>No games played yet.</p>';
            return;
        }


        for (let i = 1; i <= 6; i++) {
            const barHeight = (turnCounts[i] / maxCount) * 100;  // Calculate as percentage
            const bar = document.createElement('div');
            bar.classList.add('bar');
            bar.style.height = `${barHeight}%`;
            bar.setAttribute('data-turns', i);

            const barLabel = document.createElement('span');
            barLabel.classList.add("bar-label");
            barLabel.textContent = turnCounts[i] > 0 ? turnCounts[i] : ""; //Show only if > 0
            bar.appendChild(barLabel); // Add label to the bar
            histogramContainer.appendChild(bar); // Add bar to the histogram
        }

        const failBarHeight = (turnCounts['failed'] / maxCount) * 100;
        const failBar = document.createElement('div');
        failBar.classList.add('bar');
        failBar.style.height = `${failBarHeight}%`;
        failBar.setAttribute('data-turns', 'failed');

         const failBarLabel = document.createElement('span');
            failBarLabel.classList.add("bar-label");
            failBarLabel.textContent = turnCounts['failed'] > 0 ? turnCounts['failed'] : ""; //Show only if > 0
            failBar.appendChild(failBarLabel); // Add label to the bar

        histogramContainer.appendChild(failBar);

    } catch (error) {
        console.error("Error fetching scores:", error);
        histogramContainer.innerHTML = '<p>Error loading scores.</p>';
    }
}

// --- getWordOfTheDay ---
    function getWordOfTheDay() {
        if (wordList.length === 0) {
            console.warn("Word list is empty. Returning default word.");
            return "apple"; // Return a default if list is empty
        }

        const now = new Date();
        const gmtDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000)); // Convert to GMT
        const seed = gmtDate.getFullYear() * 10000 + (gmtDate.getMonth() + 1) * 100 + gmtDate.getDate();
        const rng = mulberry32(seed);
        const randomIndex = Math.floor(rng() * wordList.length);
        return wordList[randomIndex];
    }

    function mulberry32(a) {
        return function() {
          let t = a += 0x6D2B79F5;
          t = Math.imul(t ^ t >>> 15, t | 1);
          t ^= t + Math.imul(t ^ t >>> 7, t | 61);
          return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
    }
});