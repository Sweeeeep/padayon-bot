const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebaseServiceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/**
 * Gets the Google Sheets link for a guild.
 * @param {string} guildId - The ID of the guild.
 * @returns {Promise<string|null>} - The Google Sheets link or null if not set.
 */
async function getGoogleSheetLink(guildId) {
    const doc = await db.collection('guilds').doc(guildId).get();
    if (doc.exists) {
        return doc.data().googleSheetLink.replace(/\/$/, "") || null;
    } else {
        return null;
    }
}

/**
 * Sets the Google Sheets link for a guild.
 * @param {string} guildId - The ID of the guild.
 * @param {string} link - The Google Sheets link to set.
 * @returns {Promise<void>}
 */
async function setGoogleSheetLink(guildId, link) {
    await db.collection('guilds').doc(guildId).set({ googleSheetLink: link }, { merge: true });
}

/**
 * Clears the Google Sheets link for a guild.
 * @param {string} guildId - The ID of the guild.
 * @returns {Promise<void>}
 */
async function clearGoogleSheetLink(guildId) {
    await db.collection('guilds').doc(guildId).update({ googleSheetLink: admin.firestore.FieldValue.delete() });
}

module.exports = {
    getGoogleSheetLink,
    setGoogleSheetLink,
    clearGoogleSheetLink,
};
