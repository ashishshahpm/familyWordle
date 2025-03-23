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
/*
console.log("functions object:", functions); // Log the functions object
console.log("httpsCallable property:", functions ? functions.httpsCallable : 'functions is null/undefined'); // Check for httpsCallable
console.log("✅ Firebase Initialized");
*/

// Get references to your Cloud Functions (Namespaced API)
const createGroup = functions.httpsCallable('createGroup');
//console.log("createGroup function:", createGroup); // Add this
const addUserToGroup = functions.httpsCallable('addUserToGroup');
const joinGroup = functions.httpsCallable('joinGroup');

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

//Add Group elements
const groupNameInput = document.getElementById('group-name'); // NEW
const inviteLinkInput = document.getElementById('invite-link'); // NEW
const inviteLinkContainer = document.getElementById('invite-link-container');
const groupCreationDiv = document.getElementById('group-creation'); //NEW
const addGroupMembersDiv = document.getElementById('add-group-members');
const invitedMemberEmailInput = document.getElementById('invited-member-email');
const addMemberButton = document.getElementById('add-member');
const copyLinkButton = document.getElementById('copy-link');
let currentGroupId = null; //NEW

//Add team elements
const teamScoresContainer = document.getElementById('team-scores-container');
const teamHistogramContainer = document.getElementById('team-histogram');
const closeTeamScoresButton = document.getElementById('close-team-scores-button');
const createGroupButton = document.getElementById('create-group-button'); // NEW
const teamScoresButton = document.getElementById('team-scores-button');
const teamListContainer = document.getElementById('team-list-container');
const teamList = document.getElementById('team-list');
const closeTeamListButton = document.getElementById('close-team-list-button');
const teamNameTitle = document.getElementById('team-name-title');
const backToTeamListButton = document.getElementById('back-to-team-list-button');
const teamHistogramDiv = document.getElementById('team-histogram');

let currentDisplayMode = 'list'; // 'list' or 'scores'

let wordList = []; // Global to store word list

window.onload = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const groupIdFromURL = urlParams.get('groupId');

    if (groupIdFromURL) {
        console.log("Found groupId in URL:", groupIdFromURL);
        // Optionally display a "Joining group..." message
        const joinGroupMessage = document.getElementById('join-group-message'); // Add this ID to an element in your HTML
        if (joinGroupMessage) {
            joinGroupMessage.style.display = 'block';
            joinGroupMessage.textContent = 'Joining group...';
        }

        if (auth.currentUser) {
            console.log("User is logged in, calling addUserToGroupMembers");
            await addUserToGroupMembers(auth.currentUser, groupIdFromURL);
        } else {
            // If not logged in, store the groupId and redirect to login
            console.log("User not logged in, storing pendingGroupId");
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
       // console.log("Word list loaded:", wordList.length, "words");
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
            userNameSpan.textContent = user.displayName;
            userPhotoImg.src = user.photoURL || ''; //Set src, handle null
            userPhotoImg.style.display = user.photoURL ? 'inline' : 'none';

            userInfoDiv.style.display = 'block';
            signOutButton.style.display = 'block';
            signInButton.style.display = 'none';
            gameContainer.style.display = 'block';
            restartButton.style.display = "block";
            scoresButton.style.display = "block";

            groupCreationDiv.style.display = "block"; // SHOW the group creation UI

            restartGame().then(() => {
                document.addEventListener('keydown', handleKeyDown);
            });

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
            groupCreationDiv.style.display = 'none'; // Hide it when logged out

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

    createLetterBoxes();

    targetWord = await getWordOfTheDay(); // Await the result again
    gameContainer.style.display = 'block';
//    console.log("target word is " + targetWord);
}


restartButton.addEventListener('click', restartGame);

// --- Show Scores Function --- (MODIFIED - Added hiding of team scores)
scoresButton.addEventListener('click', () => {
    displayScores(); // Call the function to fetch and display
    hideGameAndTeamScores();
    scoresContainer.style.display = 'block'; // Show the scores container
});

closeScoresButton.addEventListener('click', () => {
    scoresContainer.style.display = 'none';
    gameContainer.style.display = "block";
})

 // --- Show Team Scores Function --- (NEW)
teamScoresButton.addEventListener('click', () => {
    displayTeamScores();
    hideGameAndScores();
    teamScoresContainer.style.display = 'block';
});

closeTeamScoresButton.addEventListener('click', () => {
    teamScoresContainer.style.display = 'none';
    gameContainer.style.display = "block";
})

  function hideGameAndScores() {
    gameContainer.style.display = 'none';
    scoresContainer.style.display = 'none';
}
function hideGameAndTeamScores(){
    gameContainer.style.display = 'none';
    teamScoresContainer.style.display = 'none';
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
   // console.log("createLetterBoxes called");
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

    const target = event.target; // Get the element where the key press happened
    const groupNameInput = document.getElementById('group-name'); // Get the group name input field
    const addMembersInput = document.getElementById('invited-member-email'); // Get the add members input field

    // If the key press happened inside the group name input OR the add members input, do nothing
    if (target === groupNameInput || target === addMembersInput) {
        return;
    }

    const key = event.key.toLowerCase();
    // console.log("Key pressed:", key);

    if (key === 'enter') {
        submitGuess();
    } else if (key === 'backspace') {
        deleteLetter();
    } else if (/^[a-z]$/.test(key)) { // Check if it's a letter
        // console.log (target)
        if (target.classList.contains('letter-box')) {
            addLetter(key); // Add to letter box
        }
        else {
            addLetter(key); // Add to wordle
        }
    }
}

function addLetter(letter) {
    // console.log("addLetter called with:", letter);
    if (currentLetterIndex < 5) {
        const row = document.getElementById(`row-${currentRow}`);
        // console.log("Current Row:", currentRow);
        if (!row) {
            // console.error("Row not found:", currentRow); // CRITICAL ERROR CHECK
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
    // console.log("deleteLetter called");
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

    //console.log("Submitting guess:", guess);

    // Check word validity *before* proceeding
    if (!(await isValidWord(guess))) {
        feedback.textContent = "Not a valid word.";
        return; // Exit early if invalid
    }


    const result = checkGuess(guess);
    // console.log("Result:", JSON.stringify(result));

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
    //console.log (`Guess is ${guess}`)
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

   // console.log("First check Result:", JSON.stringify(result));


    // Second pass: check for partial matches (orange)
    for (let i = 0; i < guessLetters.length; i++) { //use a for loop
        if (guessLetters[i] !== null && targetLetters.includes(guessLetters[i])) {
            const targetIndex = targetLetters.indexOf(guessLetters[i]);
            result[i] = { char: guessLetters[i].toUpperCase(), color: 'orange' }; // UPPERCASE HERE
            targetLetters[targetIndex] = null;
        }
    }
    // console.log("Second check Result:", JSON.stringify(result));

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
    // console.log(gameResult);

    try {
        const docRef = await db.collection('games').add(gameResult);
    //    console.log("Game results saved with ID:", docRef.id);
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
            // console.log("Word of the day:", potentialWord);
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
if (!groupName) {
    alert("Please enter a group name.");
    return;
}
if (!auth.currentUser) {
    alert("You must be signed in to create a group.");
    return;
}

try {
    const functionUrl = 'https://us-central1-familywordle-c8402.cloudfunctions.net/createGroup'; // Get from Firebase console
    const idToken = await auth.currentUser.getIdToken();

    const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + idToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { groupName: groupName } }),
    });

    if (!response.ok) {
        console.error("Error creating group Status:", response.status);
        const errorText = await response.text();
        console.error("Error creating group Body:", errorText);
        alert("Failed to create group: " + response.status + " " + errorText);
        return;
    }

    const result = await response.json();
    const groupId = result.data.groupId;
    const inviteLink = `${window.location.origin}/?groupId=${groupId}`;
    inviteLinkInput.value = inviteLink;
    inviteLinkContainer.style.display = 'block';
    addGroupMembersDiv.style.display = "block";
    currentGroupId = groupId;
    copyLinkButton.addEventListener('click', () => {
        inviteLinkInput.select();
        document.execCommand('copy');
        alert("Invite link copied to clipboard!");
    });

} catch (error) {
    console.error("Error creating group:", error);
    alert("Failed to create group: " + error.message);
}
});
   
// --- Copy Link ----
copyLinkButton.addEventListener('click', () => {
    inviteLinkInput.select();
    document.execCommand('copy');
    alert("Copied Link")
});

// --- Add Member to Group ---
addMemberButton.addEventListener('click', async () => {
    const invitedEmail = invitedMemberEmailInput.value.trim();
    if (!invitedEmail) {
        alert("Please enter an email to invite.");
        return;
    }
    if (!auth.currentUser) {
        alert("You must be signed in to add members.");
        return;
    }
    if (!currentGroupId) {
        alert("No group selected.");
        return;
    }

    try {
        const functionUrl = 'https://us-central1-familywordle-c8402.cloudfunctions.net/addUserToGroup'; // Get from Firebase console
        const idToken = await auth.currentUser.getIdToken();

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + idToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: { groupId: currentGroupId, invitedEmail: invitedEmail } }),
        });

        if (!response.ok) {
            console.error("Error adding member Status:", response.status);
            const errorText = await response.text();
            console.error("Error adding member Body:", errorText);
            alert("Failed to add member: " + response.status + " " + errorText);
            return;
        }

        const result = await response.json();
        console.log("Add member result:", result);
        alert(`User ${invitedEmail} has been invited.`);
        invitedMemberEmailInput.value = ""; // Clear the input

    } catch (error) {
        console.error("Error adding member:", error);
        alert("Failed to add member: " + error.message);
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

// Function to display the scores for a single team
function displaySingleTeamScores(groupId, groupName) {
    currentDisplayMode = 'scores';
    teamListContainer.style.display = 'none';
    teamScoresContainer.style.display = 'block';
    teamNameTitle.textContent = groupName + " Scores";
    teamHistogramDiv.innerHTML = ''; // Clear previous histogram

    if (!auth.currentUser) {
        teamHistogramDiv.innerHTML = '<p>Please sign in to see team scores.</p>';
        return;
    }

    db.collection('groups').doc(groupId).get()
        .then(groupDoc => {
            if (!groupDoc.exists) {
                teamHistogramDiv.innerHTML = '<p>Team not found.</p>';
                return;
            }
            const groupMembers = groupDoc.data().members ||``;
            const groupCreatedAtTimestamp = groupDoc.data().createdAt;
            const groupCreatedAtDate = groupCreatedAtTimestamp ? groupCreatedAtTimestamp.toDate() : null;

            if (!groupCreatedAtDate || groupMembers.length === 0) {
                teamHistogramDiv.innerHTML = `<p>No games played by members of ${groupName} since creation.</p>`;
                return;
            }

            return db.collection('games')
                .where('userId', 'in', groupMembers)
                .get()
                .then(querySnapshot => {
                    const turnCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 'failed': 0 };
                    let gamesSinceCreation = 0;
                    querySnapshot.forEach(doc => {
                        const gameDateString = doc.data().date;
                        if (gameDateString) {
                            const gameDate = new Date(gameDateString);
                            if (gameDate >= groupCreatedAtDate) {
                                gamesSinceCreation++;
                                const turns = doc.data().turns;
                                if (turnCounts.hasOwnProperty(turns)) {
                                    turnCounts[turns]++;
                                }
                            }
                        }
                    });

                    if (gamesSinceCreation === 0) {
                        teamHistogramDiv.innerHTML = `<p>No games played by members of ${groupName} since creation.</p>`;
                        return;
                    }

                    let maxCount = Math.max(...Object.values(turnCounts));
                    if (maxCount === 0) maxCount = 1; // Avoid division by zero

                    const barsContainer = document.createElement('div');
                    barsContainer.classList.add('bars-container');
                    barsContainer.style.display = 'flex';
                    barsContainer.style.justifyContent = 'space-around';
                    barsContainer.style.alignItems = 'flex-end';
                    barsContainer.style.height = '150px';
                    barsContainer.style.padding = '0 10px';
                    barsContainer.style.borderBottom = '2px solid black';

                    for (let i = 1; i <= 6; i++) {
                        const barHeight = (turnCounts[i] / maxCount) * 100;
                        const bar = document.createElement('div');
                        bar.classList.add('bar');
                        bar.style.height = `${barHeight}%`;
                        bar.style.width = `calc(100% / 9)`;
                        bar.style.margin = '0 2px';
                        bar.setAttribute('data-turns', i);
                        const barLabel = document.createElement('span');
                        barLabel.classList.add("bar-label");
                        barLabel.style.fontSize = '0.8em';
                        barLabel.textContent = turnCounts[i] > 0 ? turnCounts[i] : "";
                        bar.appendChild(barLabel);
                        barsContainer.appendChild(bar);
                    }

                    const failBarHeight = (turnCounts['failed'] / maxCount) * 100;
                    const failBar = document.createElement('div');
                    failBar.classList.add('bar');
                    failBar.style.height = `${failBarHeight}%`;
                    failBar.style.width = `calc(100% / 9)`;
                    failBar.style.margin = '0 2px';
                    failBar.setAttribute('data-turns', 'failed');
                    const failBarLabel = document.createElement('span');
                    failBarLabel.classList.add("bar-label");
                    failBarLabel.style.fontSize = '0.8em';
                    failBarLabel.textContent = turnCounts['failed'] > 0 ? turnCounts['failed'] : "";
                    failBar.appendChild(failBarLabel);
                    barsContainer.appendChild(failBar);

                    teamHistogramDiv.appendChild(barsContainer);
                });
        })
        .catch(error => {
            console.error("Error fetching team scores:", error);
            teamHistogramDiv.innerHTML = '<p>Error loading team scores.</p>';
        });
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