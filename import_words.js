require('dotenv').config();
console.log("GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
console.log("GCLOUD_PROJECT:", process.env.GCLOUD_PROJECT);

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('node:fs/promises');

initializeApp({
    credential: applicationDefault(), // Use Application Default Credentials
});

const db = getFirestore();

async function importWords(filePath) {
    try {
        // 1. Read the file
        const data = await fs.readFile(filePath, 'utf8');

        // 2. Split, trim, lowercase, filter, and remove duplicates
        const words = [...new Set(data.split('\n')
            .map(word => word.trim().toLowerCase())
            .filter(word => word !== "" && word.length === 5))
        ];

        console.log(`Read ${words.length} unique 5-letter words from ${filePath}`);

        // 3. Batch write to Firestore
        let batch = db.batch(); // Declare batch *outside* the loop
        let batchCount = 0;
        const batchSize = 500; // Firestore batch limit

        for (const word of words) {
            const docRef = db.collection('words').doc(word); // Use word as doc ID!
            batch.set(docRef, { word: word });
            batchCount++;

            if (batchCount === batchSize) {
                await batch.commit();
                console.log('Batch committed.');
                batch = db.batch(); // Create a *new* batch object
                batchCount = 0;
            }
        }

        // Commit any remaining documents
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