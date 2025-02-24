require('dotenv').config();
console.log("GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
console.log("GCLOUD_PROJECT:", process.env.GCLOUD_PROJECT);

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('node:fs/promises'); // Use promises version of fs


initializeApp({
  credential: applicationDefault(), // Use Application Default Credentials
});

const db = getFirestore();

async function importWords(filePath) {
    try {
        // 1. Read the file
        const data = await fs.readFile(filePath, 'utf8');

        // 2. Split into an array of words, trim whitespace, convert to lowercase, and remove empty strings/duplicates
        const words = [...new Set(data.split('\n') // Split by newline
          .map(word => word.trim().toLowerCase()) // Trim and lowercase
          .filter(word => word !== "" && word.length === 5))]  // Remove empty strings + only 5 letter words

        console.log(`Read ${words.length} unique words from ${filePath}`);

        // 3. Batch write to Firestore
        const batch = db.batch();
        let batchCount = 0;
        const batchSize = 500; // Firestore batch limit

        for (const word of words) {
          const docRef = db.collection('words').doc(word); // Use word as doc ID!
          batch.set(docRef, { word: word }); // Create doc with 'word' field
          batchCount++;

          if (batchCount === batchSize) {
                await batch.commit();
                console.log('Batch committed.');
                batchCount = 0; // Reset for next batch
                batch = db.batch(); // Create new batch object
          }
        }

        // Commit any remaining documents in the last batch
        if (batchCount > 0) {
            await batch.commit();
            console.log('Final batch committed.');
        }

        console.log('Words successfully imported to Firestore!');

    } catch (err) {
        console.error("Error importing words:", err);
    }
}

// --- Run the script ---
const wordFilePath = 'words.txt'; // Path to your word list file
importWords(wordFilePath);