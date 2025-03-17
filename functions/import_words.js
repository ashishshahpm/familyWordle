"use strict";

require("dotenv").config(); // Correct placement of dotenv require
const {Firestore} = require("@google-cloud/firestore");
const fs = require("node:fs/promises");

const db = new Firestore({
  projectId: process.env.PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

/**
 * Reads words from a file and imports them into Firestore.
 * @async
 * @function importWords
 * @param {string} filePath - The path to the file containing the words.
 * @return {Promise<void>}
 * @throws {Error} If there is an error reading the file or importing words.
 */
async function importWords(filePath) {
  try {
    // 1. Read the file
    const data = await fs.readFile(filePath, "utf8");

    // 2. Split, trim, lowercase, filter, and remove duplicates
    const words = [...new Set(data.split("\n")
        .map((word) => word.trim().toLowerCase())
        .filter((word) => word !== "" && word.length === 5)),
    ];

    console.log(`Read ${words.length} unique 5-letter words from ${filePath}`);

    // 3. Batch write to Firestore
    let batch = db.batch();
    let batchCount = 0;
    const batchSize = 500; // Firestore batch limit

    for (const word of words) {
      const docRef = db.collection("words").doc(word); // Use word as doc ID!
      batch.set(docRef, {word: word});
      batchCount++;

      if (batchCount === batchSize) {
        await batch.commit();
        console.log("Batch committed.");
        batch = db.batch(); // Create a *new* batch object
        batchCount = 0;
      }
    }

    // Commit any remaining documents
    if (batchCount > 0) {
      await batch.commit();
      console.log("Final batch committed.");
    }

    console.log("Words successfully imported to Firestore!");
  } catch (err) {
    console.error("Error importing words:", err);
    // Consider throwing the error here, or handling it appropriately,
    // so that the calling process knows the import failed.
    throw err;
  }
}

// --- Run the script ---
const wordFilePath = "../public/words.txt"; // Path to your word list file
importWords(wordFilePath);
