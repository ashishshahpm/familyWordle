"use strict";

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
const cors = require("cors")({origin: true}); // Import and configure CORS

/* const v1Opts = {
  region: "us-central1", // Or your desired region
  // You can add other 1st gen options here if needed, e.g., memory: '256MB'
};
*/

/**
 * Creates a new group in Firestore.
 *
 * @param {Object} data The data sent from the client.
 * @param {string} data.groupName The name of the group to create.
 * @param {Object} context The context of the callable function request.
 * @param {Object} context.auth Authentication information.
 * @returns {Promise<{groupId: string, inviteLink: string}>}
 * The group ID and invite link.
 * @throws {functions.https.HttpsError} If unauthenticated or invalid input.
 */

exports.createGroup = functions
  .runWith({
    region: "us-central1",
    memory: "256MB", // Optional: Specify memory for 1st gen
    gen: 1, // Explicitly specify 1st generation
  })
  .https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).send("Unauthorized: No Bearer token");
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      const groupName = req.body.data.groupName; // Access data sent from client
      if (!groupName || groupName.trim().length === 0) {
        res.status(400).send("Bad Request: Group name cannot be empty.");
        return;
      }

      const groupId = generateGroupId();
      await admin.firestore().collection("groups").doc(groupId).set({
        groupName: groupName,
        createdBy: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        invitedEmails: [],
        members: [uid],
      });
      const inviteLink = `https://familywordle-c8402.web.app/?groupId=${groupId}`;
      res.status(200).send({data: {groupId: groupId, inviteLink: inviteLink}});
    } catch (error) {
      console.error("Error creating group:", error);
      if (error.code === "/id-tok-expd" || error.code === "/arg-err") {
        res.status(401).send("Unauthorized: Invalid token");
      } else {
        res.status(500).send("Internal Server Error");
      }
    }
  });
});

/**
 * Generates a random string to be used as a group ID.
 * @return {string} A randomly generated ID string.
 */
function generateGroupId() {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

exports.testAuthDirect = functions
.runWith({
  region: "us-central1",
  memory: "256MB", // Optional: Specify memory for 1st gen
  gen: 1, // Explicitly specify 1st generation
})
.https.onRequest(async (req, res) => {
  cors(req, res, async () => { // Use the cors middleware
    console.log("testAuthDirect headers:", req.headers);
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("testAuthDirect: No Bearer token");
      res.status(401).send("Unauthorized: No Bearer token");
      return;
    }
    const idToken = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;
      console.log("testAuthDirect Decoded UID:", uid);
      res.status(200).send({message: "Direct Auth Success: Hello, " + uid});
    } catch (error) {
      console.error("testAuthDirect Token Verification Error:", error);
      res.status(401).send("Unauthorized: Invalid token");
    }
  });
});

/**
 * Adds a user to the invited emails list of a group.
 *
 * @param {Object} data The data sent from the client.
 * @param {string} data.groupId The ID of the group.
 * @param {string} data.userEmail The email of the user to invite.
 * @param {Object} context The context of the callable function request.
 * @returns {Promise<{success: boolean}>}
 * @throws {functions.https.HttpsError}
 */
exports.addUserToGroup = functions
  .runWith({
    region: "us-central1",
    memory: "256MB", // Optional: Specify memory for 1st gen
    gen: 1, // Explicitly specify 1st generation
  })
 .https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).send("Unauthorized: No Bearer token");
      return;
    }
    const idToken = authHeader.split("Bearer ")[1];

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      const groupId = req.body.data.groupId;
      const invitedEmail = req.body.data.invitedEmail;

      if (!groupId || !invitedEmail) {
        res.status(400).send("Bad Request: Missing groupId or invitedEmail");
        return;
      }

      const groupRef = admin.firestore().collection("groups").doc(groupId);
      const groupDoc = await groupRef.get();

      if (!groupDoc.exists) {
        res.status(404).send("Not Found: Group does not exist");
        return;
      }
      if (groupDoc.data().createdBy !== uid) {
        res.status(403).send("Forbidden: Only group creator can add members");
        return;
      }

      // Add email to invitedEmails array
      await groupRef.update({
        invitedEmails: admin.firestore.FieldValue.arrayUnion(invitedEmail),
      });
      res.status(200).send({message: `Usr ${invitedEmail} invitd2 ${groupId}`});
    } catch (error) {
      console.error("Error adding user to group:", error);
      if (error.code === "id-token-exprd" || error.code === "arg-error") {
        res.status(401).send("Unauthorized: Invalid token");
      } else {
        res.status(500).send("Internal Server Error");
      }
    }
  });
});

/**
 * Allows a user to join a group if they have been invited.
 *
 * @param {Object} data The data sent from the client.
 * @param {string} data.groupId The ID of the group to join.
 * @param {Object} context The context of the callable function request.
 * @returns {Promise<{success: boolean}>}
 * @throws {functions.https.HttpsError}
 */
exports.joinGroup = functions
  .runWith({
    region: "us-central1",
    memory: "256MB", // Optional: Specify memory for 1st gen
    gen: 1, // Explicitly specify 1st generation
  })
  .https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated",
        "User must be authenticated.");
  }
  const {groupId} = data;
  const userEmail = context.auth.token.email; // Get email

  if (!groupId) {
    throw new functions.https.HttpsError("invalid-argument",
        "Need to provide a valid group id.");
  }
  // Check if group exists
  const groupRef = db.collection("groups").doc(groupId);
  const groupDoc = await groupRef.get();

  if (!groupDoc.exists) {
    throw new functions.https.HttpsError("not-found",
        "This group does not exist");
  }

  const groupData = groupDoc.data();

  // Check if user is in the invited list (split for max-len)
  if (!groupData.invitedEmails.includes(userEmail)) {
    throw new functions.https.HttpsError("permission-denied",
        "User is not invited to this group.");
  }

  // Add the user, remove from invited, add to user doc
  await db.collection("users").doc(context.auth.uid).set({
    groups: admin.firestore.FieldValue.arrayUnion(groupId),
  }, {merge: true});

  await groupRef.update({
    members: admin.firestore.FieldValue.arrayUnion(context.auth.uid),
    invitedEmails: admin.firestore.FieldValue.arrayRemove(userEmail),
  });

  return {success: true};
});
/**
     * Validates an email address. A simple regex check.
     * @param {string} email - The email to check
     * @return {boolean} - True if valid, false otherwise.

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
} */
