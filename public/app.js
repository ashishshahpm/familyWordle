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
const functions = firebase.functions();

// Get references to your Cloud Functions (Namespaced API)
const createGroup = functions.httpsCallable('createGroup');
const addUserToGroup = functions.httpsCallable('addUserToGroup');
const joinGroup = functions.httpsCallable('joinGroup');

// Game setup
let targetWord = "apple"; // Default, will be overwritten
let attempts = 0;
const maxAttempts = 6;
let currentRow = 0;
let currentLetterIndex = 0;
let absentLetters = new Set(); // Use a Set to store unique absent letters

// DOM elements
const signInButton = document.getElementById('sign-in-button');
const signOutButton = document.getElementById('sign-out-button');
const userInfoDiv = document.getElementById('user-info-sidebar');
const userPhotoImg = document.getElementById('user-photo-sidebar');
//const userNameSpan = document.getElementById('user-name-sidebar');
const feedback = document.getElementById("feedback");
const guessesContainer = document.getElementById("guesses-container");
const hiddenInput = document.getElementById('hidden-input-trigger'); // Get hidden input
const gameContainer = document.getElementById("game-container");
const sidebar = document.getElementById('sidebar');
const ellipsisMenuButton = document.getElementById('ellipsis-menu-button');
const ellipsisMenuContainer = document.getElementById('ellipsis-menu-container');
const absentLettersDisplay = document.getElementById('absent-letters-display'); // NEW

if (ellipsisMenuButton && ellipsisMenuContainer) {
    ellipsisMenuButton.addEventListener('click', (event) => {
        // Toggle the visibility class
        const isVisible = ellipsisMenuContainer.classList.toggle('is-visible');
        ellipsisMenuContainer.classList.toggle('menu-hidden', !isVisible);
        
        // Optional: Add ARIA attribute for accessibility
        event.currentTarget.setAttribute('aria-expanded', isVisible ? 'true' : 'false');

        // Prevent this click from immediately triggering the 'click outside' listener
        event.stopPropagation(); 
    });

    // Close menu if clicked outside
    document.addEventListener('click', (event) => {
        // Check if the menu is visible and the click was NOT on the button or inside the menu
        if (ellipsisMenuContainer.classList.contains('is-visible') &&
            !ellipsisMenuButton.contains(event.target) &&
            !ellipsisMenuContainer.contains(event.target)) {
            
            ellipsisMenuContainer.classList.remove('is-visible');
            ellipsisMenuContainer.classList.add('menu-hidden');
            ellipsisMenuButton.setAttribute('aria-expanded', 'false');
        }
    });

    // Optional: Close menu if Escape key is pressed
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && ellipsisMenuContainer.classList.contains('is-visible')) {
            ellipsisMenuContainer.classList.remove('is-visible');
            ellipsisMenuContainer.classList.add('menu-hidden');
            ellipsisMenuButton.setAttribute('aria-expanded', 'false');
        }
    });

}


//Add Group elements
const groupCreationDiv = document.getElementById('group-creation'); //NEW
const groupNameInput = document.getElementById('group-name'); // NEW
const invitedEmailsInput = document.getElementById('invited-member-email2'); // Get the add members input field
//const inviteLinkInput = document.getElementById('invite-link'); // NEW
//const inviteLinkContainer = document.getElementById('invite-link-container');
//const addGroupMembersDiv = document.getElementById('add-group-members');
//const invitedMemberEmailInput = document.getElementById('invited-member-email');
let currentGroupId = null; //NEW
const createGroupButton = document.getElementById('create-group-button'); // NEW



//Add scores elements
const scoresContainer = document.getElementById('scores-container');
const scoresButton = document.getElementById('scores-button');
const closeScoresButton = document.getElementById('close-scores-button');
const histogramContainer = document.getElementById('histogram');

//Add team elements
const teamScoresContainer = document.getElementById('team-scores-container');
const teamScoresButton = document.getElementById('team-scores-button');
const closeTeamScoresButton = document.getElementById('close-team-scores-button');
const teamListContainer = document.getElementById('team-list-container');
const teamList = document.getElementById('team-list');
const closeTeamListButton = document.getElementById('close-team-list-button');
const teamNameTitle = document.getElementById('team-name-title');
const backToTeamListButton = document.getElementById('back-to-team-list-button');
const teamHistogramContainer = document.getElementById('team-histogram');


const invitationsButton = document.getElementById('invitations-button');
const invitationsContainer = document.getElementById('invitations-container');
const invitationsList = document.getElementById('invitations-list');
const closeInvitationsX = document.getElementById('close-invitations-x'); // Make sure ID is in HTML
let currentDisplayMode = 'list'; // 'list' or 'scores'

let wordList = []; // Global to store word list

window.onload = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const groupIdFromURL = urlParams.get('groupId');

    if (groupIdFromURL) {
        // Optionally display a "Joining group..." message
        const joinGroupMessage = document.getElementById('join-group-message'); // Add this ID to an element in your HTML
        if (joinGroupMessage) {
            joinGroupMessage.style.display = 'block';
            joinGroupMessage.textContent = 'Joining group...';
        }

        if (auth.currentUser) {
            await addUserToGroupMembers(auth.currentUser, groupIdFromURL);
        } else {
            // If not logged in, store the groupId and redirect to login
            localStorage.setItem('pendingGroupId', groupIdFromURL);
            // Update your sign-in button's onclick to handle this
            const signInButton = document.getElementById('sign-in-button'); // Make sure you have a sign-in button
            if (signInButton) {
                signInButton.onclick = () => {
                    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
                };
            }
            if (joinGroupMessage) {
                joinGroupMessage.textContent = 'Please sign in to join the group.';
            }
        }
    }
};

//Add user to group function
async function addUserToGroupMembers(user, groupId) {
    console.log("addUserToGroupMembers called with user:", user.uid, "and groupId:", groupId);
    try {
        const functionUrl = 'https://us-central1-familywordle-c8402.cloudfunctions.net/joinGroupByLink'; // Use the new function URL
        const idToken = await user.getIdToken();

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + idToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ groupId: groupId }),
        });

        const joinGroupMessage = document.getElementById('join-group-message');
        if (response.ok) {
            console.log(`User ${user.uid} added to group ${groupId}`);
            if (joinGroupMessage) {
                joinGroupMessage.textContent = 'Successfully joined the group!';
                setTimeout(() => joinGroupMessage.style.display = 'none', 3000);
            }
            // Optionally redirect the user or update the UI
            window.history.replaceState({}, document.title, window.location.pathname); // Remove groupId from URL
            displayTeamScores(); // Refresh the histograms
        } else {
            console.error("Error joining group:", response.status, await response.text());
            if (joinGroupMessage) {
                joinGroupMessage.textContent = 'Failed to join group: ' + response.status;
            }
        }
    } catch (error) {
        console.error("Error calling joinGroupByLink function:", error);
        const joinGroupMessage = document.getElementById('join-group-message');
        if (joinGroupMessage) {
            joinGroupMessage.textContent = 'Error joining group.';
        }
    }
}

// --- Load Word List from Firestore ---
async function loadWordList() {
    try {
        const querySnapshot = await db.collection('words').get();
        wordList = querySnapshot.docs.map(doc => doc.data().word);
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
    //restartButton.disabled = true;
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
    createLetterBoxes(); // Create boxes *before* auth state change

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // User is signed in
            console.log('User signed in:', user.uid);
            // Check for pending group invite
            const pendingGroupId = localStorage.getItem('pendingGroupId');
            if (pendingGroupId) {
                joinGroup({groupId: pendingGroupId}).then((result) => { //try joining group.
                    if(result.data.success){
                        console.log("Successfully joined the group")
                    }
                    localStorage.removeItem('pendingGroupId'); // Clear the pending invite
                }).catch(error => { //catch any error
                    console.error("Error joining group", error)
                })
            }
            //userNameSpan.textContent = user.displayName;
            userPhotoImg.src = user.photoURL || ''; //Set src, handle null
            userPhotoImg.style.display = user.photoURL ? 'inline' : 'none';
            userInfoDiv.style.display = 'block';
            signOutButton.style.display = 'block';
            signInButton.style.display = 'none';
            gameContainer.style.display = 'block';
            scoresButton.style.display = "block";
            groupCreationDiv.style.display = "block"; // SHOW the group creation UI
            invitationsButton.style.display = "block"; // Show invitations button

            await restartGame(); //Await restart to check play status
            checkInvite();
            document.addEventListener('keydown', handleKeyDown);
            if (guessesContainer && hiddenInput) {
                guessesContainer.addEventListener('click', () => {
                    hiddenInput.focus();
                });

                // *** ADD INPUT LISTENER TO HIDDEN INPUT ***
                hiddenInput.addEventListener('input', handleHiddenInput);
            }

        

        } else {
            // User is signed out
            userInfoDiv.style.display = 'none';
            signOutButton.style.display = 'none';
            signInButton.style.display = 'block';
            userPhotoImg.style.display = 'none';
            //userNameSpan.textContent = '';
            gameContainer.style.display = 'none';
            scoresButton.style.display = "none";
            scoresContainer.style.display = 'none';
            document.removeEventListener('keydown', handleKeyDown);
            if (hiddenInput) { // Remove input listener on logout
                hiddenInput.removeEventListener('input', handleHiddenInput);
            }
            groupCreationDiv.style.display = 'none'; // Hide it when logged out
            invitationsButton.style.display = "none"; // Hide invitations button
            invitationsContainer.style.display = 'none'; // Hide invitations list
            disableGameInput(); // Ensure input is disabled on logout
        }
    });
    });


//Open close sidebar
userPhotoImg.addEventListener("click", () => {
    sidebar.classList.toggle("open")
})

// --- Restart Game Function ---
async function restartGame() {
    attempts = 0;
    currentRow = 0;
    currentLetterIndex = 0;
    feedback.textContent = "";
    scoresContainer.style.display = 'none';
    teamScoresContainer.style.display = "none";
    absentLetters = new Set(); // Reset the set
    updateAbsentLettersDisplay(); // Clear the display

    createLetterBoxes();

    targetWord = await getWordOfTheDay(); // Await the result again
    gameContainer.style.display = 'block';
    // --- Check if user already played today ---
    if (auth.currentUser && targetWord !== "cluck") { // Check only if logged in and word is valid
        try {
            const gamesRef = db.collection('games');
            const querySnapshot = await gamesRef
                .where('userId', '==', auth.currentUser.uid)
                .where('target', '==', targetWord) // Check for game with today's word
                .limit(1) // We only need to know if at least one exists
                .get();

            if (!querySnapshot.empty) {
                // User has already played this word today
                console.log("User already played today's word:", targetWord);
                feedback.textContent = "You've already played today! Come back tomorrow.";
                // Optionally display their previous result here
                // displayPreviousResult(querySnapshot.docs[0].data());
                enableGameInput(); // Disable further input
            } else {
                // User has NOT played today, enable input
                console.log("User has not played today's word yet.");
                enableGameInput();
            }
        } catch (error) {
            console.error("Error checking previous games:", error);
            feedback.textContent = "Error checking game status.";
            disableGameInput(); // Disable input on error
        }
    } else if (targetWord === "cluck") {
         feedback.textContent = "Error loading word list. Try again later.";
         disableGameInput();
    } else {
         enableGameInput(); // Allow play if not logged in (though saving won't work)
    }
}


//restartButton.addEventListener('click', restartGame);


// --- Helper Functions for Hiding Containers (Modified) ---
function hideGameAndAllScores() {
    gameContainer.style.display = 'none';
    scoresContainer.style.display = 'none';
    teamScoresContainer.style.display = 'none';
}

function hideGameAndScores() {
    gameContainer.style.display = 'none';
    scoresContainer.style.display = 'none';
    invitationsContainer.style.display = 'none'; // Hide invitations too
}
function hideGameAndTeamScores(){
    gameContainer.style.display = 'none';
    teamScoresContainer.style.display = "none";
    invitationsContainer.style.display = 'none'; // Hide invitations too
}

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



function handleKeyDown(event) {
    if (attempts >= maxAttempts) return; // Prevent input after game over
    if (sidebar.classList.contains('open')) return; //If sidebar is open, don't allow

    const key = event.key.toLowerCase();
    const target = event.target; // Get the element where the key press happened
    const groupNameInput = document.getElementById('group-name'); // Get the group name input field
    const invitedEmailsInput = document.getElementById('invited-member-email2'); // Get the add members input field

    // If the key press happened inside the group name input OR the add members input, do nothing
    if (target === groupNameInput || target === invitedEmailsInput) {
        return;
    }

    // If the event target is the hidden input, prevent default for certain keys
    // to avoid double handling if `input` event also processes it.
    if (target === hiddenInput && /^[a-z]$/.test(key)) {
        event.preventDefault(); // Prevent letter from appearing in hidden input if keydown also handles it
        // We are relying on the 'input' event for letters from virtual keyboard
        return; // Let the 'input' event handle letters from virtual keyboard
    }


    if (key === 'enter') {
        submitGuess();
    } else if (key === 'backspace') {
        deleteLetter();
    } else if (/^[a-z]$/.test(key) && target !== hiddenInput) {
        // This handles physical keyboard letters if focus isn't on hiddenInput,
        // or if the 'input' event somehow doesn't catch it.
        addLetter(key);
    }
}

   // --- NEW: Handler for the 'input' event on the hidden input ---
function handleHiddenInput(event) {
    const typedValue = event.target.value;
    if (typedValue && /^[a-z]$/i.test(typedValue.slice(-1))) { // Check last char is a letter
        const lastChar = typedValue.slice(-1).toLowerCase();
        addLetter(lastChar);
    }
    // ALWAYS clear the hidden input immediately after processing
    event.target.value = "";
}

function addLetter(letter) {
    if (currentLetterIndex < 5) {
        const row = document.getElementById(`row-${currentRow}`);
        if (!row) {
            console.error("Row not found:", currentRow); // CRITICAL ERROR CHECK
            return; // Exit if row not found
        }
        const boxes = row.querySelectorAll('.letter-box');

        if (currentLetterIndex >= boxes.length) {
            console.error("currentLetterIndex out of bounds:", currentLetterIndex);
            return;
        }
        boxes[currentLetterIndex].textContent = letter.toUpperCase();
        currentLetterIndex++;
    }
}

function deleteLetter() {
    if (currentLetterIndex > 0) {
        currentLetterIndex--;
        const row = document.getElementById(`row-${currentRow}`);
        if (!row) {
            // console.error("Row not found:", currentRow); // CRITICAL ERROR CHECK
            return; // Exit if row not found
        }
        const boxes = row.querySelectorAll('.letter-box');
        if (currentLetterIndex >= boxes.length) { // Prevent out-of-bounds access
            // console.error("currentLetterIndex out of bounds:", currentLetterIndex);
            return;
        }
        boxes[currentLetterIndex].textContent = '';
    }
}

 // --- Submit Guess (Modified) ---
 async function submitGuess() {
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

    // Check word validity *before* proceeding
    if (!(await isValidWord(guess))) {
        feedback.textContent = "Not a valid word.";
        return; // Exit early if invalid
    }


    const result = checkGuess(guess);

    // Apply colors
    result.forEach((letterInfo, index) => {
        boxes[index].classList.add(letterInfo.color);
         // --- ADD Logic to track absent letters ---
         if (letterInfo.color === 'gray') {
            absentLetters.add(letterInfo.char.toLowerCase()); // Add lowercase version
        }
    });

    updateAbsentLettersDisplay(); // Update the display after guess

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

// --- NEW: Function to update absent letters display ---
function updateAbsentLettersDisplay() {
    if (absentLettersDisplay) { // Check if element exists
        const sortedAbsent = [...absentLetters].sort(); // Convert Set to array and sort
        absentLettersDisplay.textContent = sortedAbsent.join(', ').toUpperCase(); // Join, uppercase
    } else {
        console.warn("Absent letters display element not found!");
    }
}

// --- Enable Game Input ---
function enableGameInput() {
    document.removeEventListener('keydown', handleKeyDown); // Remove first to prevent duplicates
    document.addEventListener('keydown', handleKeyDown);
}

// --- Disable Game Input ---
function disableGameInput() {
    document.removeEventListener('keydown', handleKeyDown);
    // Optionally, visually disable the letter boxes too
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
    //console.log (`Target Word is ${targetWord}`)

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
    disableGameInput();
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

    try {
        const docRef = await db.collection('games').add(gameResult);
    } catch (error) {
        console.error("Error saving game results:", error);
    }
}

async function displayScores() {
    const user = auth.currentUser;
    if (!user) {
        console.warn("No user signed in.  Cannot display scores.");
        histogramContainer.innerHTML = "<p>Please sign in to view scores.</p>";
        return;
    }

    histogramContainer.innerHTML = ''; // Clear previous histogram - GOOD

    try {
        const querySnapshot = await db.collection('games')
            .where('userId', '==', user.uid)
            .orderBy('date', 'desc')
            .get();

        if (querySnapshot.empty) {
            histogramContainer.innerHTML = '<p>No scores found.</p>';
            return;
        }
        //THIS IS WHERE I NEEDED THE CORRECTION
        const turnCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 'failed': 0 };
        querySnapshot.forEach(doc => {
            const turns = doc.data().turns; // THIS LINE IS CORRECT
            if (turnCounts.hasOwnProperty(turns)) {
                turnCounts[turns]++;
            }
        });

        let maxCount = Math.max(...Object.values(turnCounts));
        if(maxCount === 0){
            histogramContainer.innerHTML = "<p>No games played yet.</p>";
            return;
        }

        for (let i = 1; i <= 6; i++) {
            const barHeight = (turnCounts[i] / maxCount) * 100;
            const bar = document.createElement('div');
            bar.classList.add('bar');
            bar.style.height = `${barHeight}%`;
            bar.setAttribute('data-turns', i);
            const barLabel = document.createElement('span');
            barLabel.classList.add("bar-label");
            barLabel.textContent = turnCounts[i] > 0 ? turnCounts[i] : "";
            bar.appendChild(barLabel); // Append label to the bar -- GOOD
            histogramContainer.appendChild(bar); // Append bar to the container --GOOD
        }
          //failed bar
        const failBarHeight = (turnCounts['failed'] / maxCount) * 100;
        const failBar = document.createElement('div');
        failBar.classList.add('bar');
        failBar.style.height = `${failBarHeight}%`;
        failBar.setAttribute('data-turns', 'failed'); //GOOD
        const failBarLabel = document.createElement('span'); //GOOD
        failBarLabel.classList.add("bar-label");
        failBarLabel.textContent = turnCounts['failed'] > 0 ? turnCounts['failed'] : "";
        failBar.appendChild(failBarLabel);
        histogramContainer.appendChild(failBar); //GOOD

    } catch (error) {
        console.error("Error fetching scores:", error);
        histogramContainer.innerHTML = '<p>Error loading scores.</p>';
    }
}


// --- getWordOfTheDay ---
async function getWordOfTheDay() {
    if (wordList.length === 0) {
        console.warn("Word list is empty. Returning 'cluck'.");
        return "cluck";
    }

    const now = new Date();
    const gmtDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000)); // Convert to GMT
    const seed = gmtDate.getFullYear() * 10000 + (gmtDate.getMonth() + 1) * 100 + gmtDate.getDate();
    const rng = mulberry32(seed);

    const randomIndex = Math.floor(rng() * wordList.length);
    const potentialWord = wordList[randomIndex];

    // Use isValidWord to check against the dictionary API
    try {
        if (await isValidWord(potentialWord)) {
            return potentialWord;
        } else {
            console.warn("Selected word was invalid (API check). Returning 'cluck'.");
            return "cluck";
        }
    } catch (error) {
        console.error("Error checking word validity:", error);
        return "cluck"; // Return "cluck" on any error
    }
}

function mulberry32(a) {
    return function() {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// --- Create Group Button Listener 
createGroupButton.addEventListener('click', async () => {
    const groupName = groupNameInput.value.trim();
    const emailsString = invitedEmailsInput.value.trim();

    if (!groupName) {
        alert("Please enter a group name.");
        return;
    }
    if (!auth.currentUser) {
        alert("You must be signed in to create a group.");
        return;
    }
    if (!emailsString) {
        alert("Please enter at least one email address to invite.");
        return;
    }

    // Process emails string into an array
    const emailsToInvite = emailsString
        .split(/[\n,]+/)
        .map(email => email.trim())
        .filter(email => email !== "" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

    if (emailsToInvite.length === 0) {
        alert("Please enter at least one valid email address.");
        return;
    }

    createGroupButton.disabled = true;
    feedback.textContent = "Creating group..."; // Update feedback

    let groupId = null; // Define groupId here to make it accessible in finally

    try {
        // --- 1. Create the Group using fetch ---
        const createGroupUrl = 'https://us-central1-familywordle-c8402.cloudfunctions.net/createGroup';
        const idToken = await auth.currentUser.getIdToken();
        const response = await fetch(createGroupUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + idToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: { groupName: groupName } }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error creating group Status:", response.status);
            console.error("Error creating group Body:", errorText);
            throw new Error(`Failed to create group: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        groupId = result.data.groupId; // Assign to outer groupId

        if (!groupId) {
            throw new Error("Group ID not received after creation.");
        }
        console.log("Group created with ID:", groupId);
        currentGroupId = groupId; // *** ASSIGN TO currentGroupId HERE ***


        // --- 2. Send Invites using fetch (in parallel) ---
        feedback.textContent = "Sending invites..."; // Update feedback
        console.log("Attempting to send invites via fetch for emails:", emailsToInvite);
        const addUserToGroupUrl = 'https://us-central1-familywordle-c8402.cloudfunctions.net/addUserToGroup';
        // We can reuse the idToken obtained earlier

        let invitesSent = 0;
        let inviteErrors = 0;
        const invitePromises = emailsToInvite.map(async (email) => {
            try {
                 console.log("Value of currentGroupId before addUserToGroup call:", currentGroupId); // Add this log
                 if (!currentGroupId) { // Add extra safety check
                    console.error("currentGroupId is null inside map, skipping invite for", email);
                    inviteErrors++;
                    return; // Skip this iteration
                 }

                const inviteResponse = await fetch(addUserToGroupUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + idToken, // Use same token
                        'Content-Type': 'application/json',
                    },
                    // Use the correct currentGroupId variable
                    body: JSON.stringify({ data: { groupId: currentGroupId, invitedEmail: email } }),
                });

                if (inviteResponse.ok) {
                    invitesSent++;
                    console.log(`Invite request sent for ${email}`);
                } else {
                    inviteErrors++;
                    const errorText = await inviteResponse.text();
                    console.error(`Error inviting ${email} Status: ${inviteResponse.status}, Body: ${errorText}`);
                }
            } catch (inviteError) {
                inviteErrors++;
                console.error(`Network error or other issue inviting ${email}:`, inviteError);
            }
        });

        // Wait for all invite attempts to finish
        await Promise.all(invitePromises);

        // Provide final feedback
        let finalMessage = `Group "${groupName}" created. `;
        if (invitesSent > 0) {
            finalMessage += `${invitesSent} invite(s) sent. `;
        }
        if (inviteErrors > 0) {
            finalMessage += `${inviteErrors > 0 ? inviteErrors : ''} invite(s) failed (check console).`; // Simplified
        }
        feedback.textContent = finalMessage;
        // alert(finalMessage); // Alert might be excessive, feedback div is better

        // Reset the form only on complete success (or partial success)
        groupNameInput.value = '';
        invitedEmailsInput.value = '';

    } catch (error) { // Catch errors from createGroup or Promise.all
        console.error("Error in group creation/invite process:", error);
        feedback.textContent = "Error: " + error.message;
        // alert("Error creating group or sending invites: " + error.message); // Use feedback div
    } finally {
        createGroupButton.disabled = false; // Re-enable button
    }
});
   

// --- Check for Invitation Link ---
function checkInvite() {
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('groupId');
    if (groupId) {
        // Store the group ID (e.g., in localStorage)
        localStorage.setItem('pendingGroupId', groupId);
        joinGroup({ groupId: groupId }).then((result) => {
        if (result.data.success) {
            // Remove the query parameter
            const newUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({ path: newUrl }, '', newUrl);
            alert("Successfully joined the group!");
            localStorage.removeItem('pendingGroupId')

        }
    }).catch(error => {
            console.log("Error Joining Group:", error);
            alert("Error Joining group:", error.message);
    })
    }
}   
 
// Function to show the team list
function showTeamList() {
    currentDisplayMode = 'list';
    teamListContainer.style.display = 'block';
    teamScoresContainer.style.display = 'none';
    teamList.innerHTML = ''; // Clear previous list

    if (!auth.currentUser) {
        teamList.innerHTML = '<li>Please sign in to see your teams.</li>';
        return;
    }

    db.collection('groups')
        .where('members', 'array-contains', auth.currentUser.uid)
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                teamList.innerHTML = '<li>You are not a member of any teams.</li>';
                return;
            }
            snapshot.forEach(doc => {
                const groupName = doc.data().groupName || 'Unnamed Group';
                const listItem = document.createElement('li');
                listItem.textContent = groupName;
                listItem.style.cursor = 'pointer';
                listItem.style.padding = '8px 0';
                listItem.style.borderBottom = '1px solid #eee';
                listItem.addEventListener('click', () => displaySingleTeamScores(doc.id, groupName));
                teamList.appendChild(listItem);
            });
        })
        .catch(error => {
            console.error("Error fetching teams:", error);
            teamList.innerHTML = '<li>Error loading your teams.</li>';
        });
}


async function displaySingleTeamScores(groupId, groupName) {
    currentDisplayMode = 'scores'; // Set display mode
    teamListContainer.style.display = 'none';
    teamScoresContainer.style.display = 'block';
    teamNameTitle.textContent = groupName + " Scores"; // Set the title
    teamHistogramContainer.innerHTML = ''; // Clear previous histogram

    if (!auth.currentUser) {
        teamHistogramContainer.innerHTML = '<p>Please sign in to see team scores.</p>';
        return;
    }

    const currentUserId = auth.currentUser.uid;

    try { // Use try...catch for robustness
        const groupDoc = await db.collection('groups').doc(groupId).get();

        if (!groupDoc.exists) {
            teamHistogramContainer.innerHTML = '<p>Team not found.</p>';
            return;
        }
        const groupMembers = groupDoc.data().members || [];
        const groupCreatedAtTimestamp = groupDoc.data().createdAt;
        const groupCreatedAtDate = groupCreatedAtTimestamp ? groupCreatedAtTimestamp.toDate() : null;

        if (!groupCreatedAtDate || groupMembers.length === 0) {
            teamHistogramContainer.innerHTML = `<p>No games played by members of ${groupName} since creation.</p>`;
            return;
        }

        const querySnapshot = await db.collection('games')
            .where('userId', 'in', groupMembers)
            .get();

        const userTurnCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 'failed': 0 };
        const otherTurnCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 'failed': 0 };
        let gamesSinceCreationCount = 0;

        querySnapshot.forEach(doc => {
            const gameData = doc.data();
            const gameDateString = gameData.date;
            const gameUserId = gameData.userId;
            const gameTurns = gameData.turns; // Use gameTurns here

            if (gameDateString) {
                const gameDate = new Date(gameDateString);
                if (gameDate >= groupCreatedAtDate) {
                    gamesSinceCreationCount++;

                    // Check if gameTurns is a valid key (1-6 or 'failed')
                    if (userTurnCounts.hasOwnProperty(gameTurns)) {
                        if (gameUserId === currentUserId) {
                            userTurnCounts[gameTurns]++;
                        } else {
                            otherTurnCounts[gameTurns]++;
                        }
                    } else {
                         console.warn("Invalid 'turns' value in game doc:", gameTurns);
                    }
                }
            } else {
                 console.warn("Game doc missing 'date' field:", doc.id);
            }
        });

        if (gamesSinceCreationCount === 0) {
            teamHistogramContainer.innerHTML = `<p>No games played by members of ${groupName} since creation.</p>`;
            return;
        }

        const allTurnCounts = {};
        for (let i = 1; i <= 6; i++) { allTurnCounts[i] = userTurnCounts[i] + otherTurnCounts[i]; }
        allTurnCounts['failed'] = userTurnCounts['failed'] + otherTurnCounts['failed'];
        let maxCount = Math.max(...Object.values(allTurnCounts));
        if (maxCount === 0) maxCount = 1; // Avoid division by zero

        // --- Draw histogram bars directly into teamHistogramContainer ---
        for (let i = 1; i <= 6; i++) {
            const userBarHeight = (userTurnCounts[i] / maxCount) * 100;
            const userBar = document.createElement('div');
            userBar.classList.add('bar', 'user-bar');
            userBar.style.height = `${userBarHeight}%`;
            userBar.setAttribute('data-turns', i);
             userBar.setAttribute('data-user', 'current');
            const userBarLabel = document.createElement('span');
            userBarLabel.classList.add("bar-label");
            userBarLabel.textContent = userTurnCounts[i] > 0 ? userTurnCounts[i] : "";
            userBar.appendChild(userBarLabel);
            teamHistogramContainer.appendChild(userBar); // Append user bar

            const otherBarHeight = (otherTurnCounts[i] / maxCount) * 100;
            const otherBar = document.createElement('div');
            otherBar.classList.add('bar', 'other-bar');
            otherBar.style.height = `${otherBarHeight}%`;
             otherBar.setAttribute('data-turns', i);
             otherBar.setAttribute('data-user', 'other');
            const otherBarLabel = document.createElement('span');
            otherBarLabel.classList.add("bar-label");
            otherBarLabel.textContent = otherTurnCounts[i] > 0 ? otherTurnCounts[i] : "";
            otherBar.appendChild(otherBarLabel);
            teamHistogramContainer.appendChild(otherBar); // Append other bar
        }

        // For 'failed'
        const userFailBarHeight = (userTurnCounts['failed'] / maxCount) * 100;
        const userFailBar = document.createElement('div');
        userFailBar.classList.add('bar', 'user-bar');
        userFailBar.style.height = `${userFailBarHeight}%`;
        userFailBar.setAttribute('data-turns', 'failed');
         userFailBar.setAttribute('data-user', 'current');
        const userFailBarLabel = document.createElement('span');
        userFailBarLabel.classList.add("bar-label");
        userFailBarLabel.textContent = userTurnCounts['failed'] > 0 ? userTurnCounts['failed'] : "";
        userFailBar.appendChild(userFailBarLabel);
        teamHistogramContainer.appendChild(userFailBar);

        const otherFailBarHeight = (otherTurnCounts['failed'] / maxCount) * 100;
        const otherFailBar = document.createElement('div');
        otherFailBar.classList.add('bar', 'other-bar');
        otherFailBar.style.height = `${otherFailBarHeight}%`;
        otherFailBar.setAttribute('data-turns', 'failed');
        otherFailBar.setAttribute('data-user', 'other');
        const otherFailBarLabel = document.createElement('span');
        otherFailBarLabel.classList.add("bar-label");
        otherFailBarLabel.textContent = otherTurnCounts['failed'] > 0 ? otherTurnCounts['failed'] : "";
        otherFailBar.appendChild(otherFailBarLabel);
        teamHistogramContainer.appendChild(otherFailBar);
        // --- End of drawing histogram bars ---

        // Add a legend
        const legend = document.createElement('div');
        legend.id = 'team-scores-legend'
        legend.innerHTML = `
            <span title="Your Scores"><span class="legend-swatch user-bar-legend"></span> Your Scores</span>
            <span title="Other Team Members' Scores"><span class="legend-swatch other-bar-legend"></span> Team Scores</span>
        `;
        teamHistogramContainer.appendChild(legend);

    } catch (error) {
        console.error("Error fetching team scores:", error);
        teamHistogramContainer.innerHTML = '<p>Error loading team scores.</p>';
    }
}

// --- Add Event Listener for Invitations Button ---
invitationsButton.addEventListener('click', () => {
    displayInvitations();
    hideGameAndAllScores(); // Helper to hide other popups
    invitationsContainer.style.display = 'block';
});

// --- Add Event Listener for Closing Invitations ---
if (closeInvitationsX) { // Check if the element exists
    closeInvitationsX.addEventListener('click', () => {
        invitationsContainer.style.display = 'none';
        gameContainer.style.display = "block"; // Or maybe don't show game? Decide behavior.
    });
} else {
    console.warn("Element with ID 'close-invitations-x' not found.");
}


// --- NEW: Function to Display Invitations ---
async function displayInvitations() {
    invitationsList.innerHTML = ''; // Clear previous list

    if (!auth.currentUser) {
        invitationsList.innerHTML = '<li>Please sign in to see your invitations.</li>';
        return;
    }
    const currentUserEmail = auth.currentUser.email;
    if (!currentUserEmail) {
         invitationsList.innerHTML = '<li>Could not retrieve your email address.</li>';
         return;
    }

    try {
        const querySnapshot = await db.collection('groups')
            .where('invitedEmails', 'array-contains', currentUserEmail)
            .get();

        if (querySnapshot.empty) {
            invitationsList.innerHTML = '<li>No pending invitations found.</li>';
            return;
        }

        querySnapshot.forEach(async (doc) => { // Use async for potential inviter lookup
            const groupId = doc.id;
            const groupData = doc.data();
            const groupName = groupData.groupName || 'Unnamed Group';
            const inviterUid = groupData.createdBy; // UID of the person who created group
            const createdAtTimestamp = groupData.createdAt;
            let inviterInfo = 'Inviter info unavailable'; // Default

            // --- Format Date ---
            let formattedDate = 'Unknown Date';
            if (createdAtTimestamp) {
                 try {
                    const date = createdAtTimestamp.toDate();
                    formattedDate = date.toLocaleDateString("en-US", {
                        year: 'numeric', month: 'short', day: 'numeric' // Simpler format
                    });
                } catch(dateError){ console.error("Error formatting date:", dateError)}
            }
            // --- End Date Format ---

            // --- Create List Item ---
            const listItem = document.createElement('li');

            const infoSpan = document.createElement('span');
            infoSpan.classList.add('invite-info');
            infoSpan.innerHTML = `
                <span class="group-name">${groupName}</span>
                <span class="invite-date">Invited on: ${formattedDate}</span>
                <span class="inviter-info" data-uid="${inviterUid}">Invited by: Loading...</span>
            `;

            const joinButton = document.createElement('button');
            joinButton.textContent = 'Join';
            joinButton.classList.add('join-button');
            joinButton.onclick = async () => { // Use async for the function call
                joinButton.textContent = 'Joining...';
                joinButton.disabled = true;
                try {
                    // Use the existing joinGroup cloud function (which checks invite)
                    const result = await joinGroup({ groupId: groupId });
                    if (result.data.success) {
                        alert(`Successfully joined ${groupName}!`);
                        listItem.remove(); // Remove the invitation from the list
                        // Optionally, refresh team list or histograms
                    } else {
                         alert(`Failed to join ${groupName}.`); // Should not happen if error wasn't thrown
                         joinButton.textContent = 'Join';
                         joinButton.disabled = false;
                    }
                } catch (error) {
                    console.error("Error joining group:", error);
                    alert(`Error joining ${groupName}: ${error.message}`);
                    joinButton.textContent = 'Join';
                    joinButton.disabled = false;
                }
            };

            listItem.appendChild(infoSpan);
            listItem.appendChild(joinButton);
            invitationsList.appendChild(listItem);

            // --- Fetch Inviter Name (Optional, requires users collection) ---
            // If you decide to add a users collection later:
            /*
            try {
                const inviterDoc = await db.collection('users').doc(inviterUid).get();
                if (inviterDoc.exists) {
                    const inviterName = inviterDoc.data().displayName || 'Unknown User';
                    const inviterSpan = listItem.querySelector('.inviter-info');
                    if(inviterSpan) inviterSpan.textContent = `Invited by: ${inviterName}`;
                }
            } catch (fetchError) {
                console.error("Could not fetch inviter name:", fetchError);
            }
            */
            // For now, we won't fetch the inviter name as there's no users collection
            const inviterSpan = listItem.querySelector('.inviter-info');
            if(inviterSpan) inviterSpan.textContent = `(Group created on ${formattedDate})`;


        });

    } catch (error) {
        console.error("Error fetching invitations:", error);
        invitationsList.innerHTML = '<li>Error loading invitations.</li>';
    }
}

// Event listeners
teamScoresButton.addEventListener('click', showTeamList);
closeTeamListButton.addEventListener('click', () => teamListContainer.style.display = 'none');
backToTeamListButton.addEventListener('click', showTeamList);
closeTeamScoresButton.addEventListener('click', () => {
    if (currentDisplayMode === 'scores') {
        showTeamList(); // Go back to the list if showing scores
    } else {
        teamListContainer.style.display = 'none'; // Close if showing list
    }
});



});