require('dotenv').config();

const { storeData, InitializeFirebaseApp } = require('./firebase');
const { Client, IntentsBitField } = require('discord.js');
const axios = require('axios');

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ]
});

client.on('ready', async (c) => {
    InitializeFirebaseApp();
    console.log(`✅ ${c.user.tag} is online`);
    // Optionally, call storeData() if needed
    // await storeData();
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        return interaction.reply({ content: 'pong', ephemeral: true });
    }

    const options = ['ign', 'guild', 'lvl', 'gr', 'dmg', 'acc', 'def'].reduce((acc, key) => {
        acc[key] = interaction.options.get(key)?.value;
        return acc;
    }, {});

    const { ign, lvl, gr, dmg, acc, def } = options;
    const user = interaction.member.nickname || interaction.member.user.username;

    try {
        // Check if the interaction has already been acknowledged
        if (interaction.replied || interaction.deferred) return;

        await interaction.deferReply(); // Defer the reply to avoid timeout issues

        try {

            const checkUrl = `${process.env.SHEET_GOOGLE_SCRIPT_URL}?sheetName=RAWDATA-STATS&column=IGN&search=${ign}`;
            const checkResponse = await axios.get(checkUrl);

            const latestEntry = checkResponse.data.sort((a, b) => new Date(b.DATE) - new Date(a.DATE))[0];

            const currentDate = new Date();

            const lastEntryDate = new Date(latestEntry.DATE);
            const startOfCurrentWeek = getStartOfWeek(currentDate);
            const endOfCurrentWeek = new Date(startOfCurrentWeek);
            endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6); // Assuming week ends on Sunday

            if (lastEntryDate >= startOfCurrentWeek && lastEntryDate <= endOfCurrentWeek) {
                if (interaction.deferred) {
                    return interaction.editReply(`Your progress data has already been added this week. Please wait until next week to update it..`);
                } else {
                    return interaction.reply(`Your progress data has already been added this week. Please wait until next week to update it.`);
                }
            } 
        } catch (error) {
            console.error('Error:', error.message);
            if (interaction.deferred) {
                return interaction.editReply(`Your progress data has already been added this week. Please wait until next week to update it..`);
            } else {
                return interaction.reply(`Your progress data has already been added this week. Please wait until next week to update it.`);
            }
        }

        const lastEntryDate = new Date(latestEntry.DATE);
        const currentDate = new Date();
        
        // Calculate the difference in milliseconds
        const diffInMs = currentDate - lastEntryDate;
        // Convert milliseconds to days
        const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

        if (!(diffInDays >= 7)) {
            const remainingDays = Math.ceil(7 - diffInDays);
            if (interaction.deferred) {
                return interaction.editReply(`Your last data is only ${Math.floor(diffInDays)} days old. Please wait another ${remainingDays} days before submitting again.`);
            } else {
                return interaction.reply(`Your last data is only ${Math.floor(diffInDays)} days old. Please wait another ${remainingDays} days before submitting again.`);
            }
        }

        console.log(latestEntry);

        const searchUrl = `${process.env.SHEET_GOOGLE_SCRIPT_URL}?sheetName=RAWDATA-MEMBERS&column=IGN&search=${ign}`;
        const searchResponse = await axios.get(searchUrl);

        if (searchResponse.data.length === 0) {
            // Check if the interaction is still valid before trying to edit the reply
            if (interaction.deferred) {
                return interaction.editReply("Unable to find your IGN in the records. Please contact your GL/DGM.");
            } else {
                return interaction.reply("Unable to find your IGN in the records. Please contact your GL/DGM.");
            }
        }

        const postData = {
            "DATE": new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
            "IGN": ign,
            "LVL": lvl,
            "GR": gr,
            "DMG": dmg,
            "DEF": def,
            "ACC": acc,
            "DISCORD": user,
        };

        const insertResponse = await axios.post(`${process.env.SHEET_GOOGLE_SCRIPT_URL}?sheetName=RAWDATA-STATS&row=2`, JSON.stringify(postData), {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        // Check if the interaction is still valid before trying to edit the reply
        if (interaction.deferred) {
            return interaction.editReply("Thank you for submitting the details of your character!");
        } else {
            return interaction.reply("Thank you for submitting the details of your character!");
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        // Handle errors when interaction may have expired
        if (interaction.deferred) {
            return interaction.editReply("An error occurred. Please report it to the GL/DGM.");
        } else if (interaction.replied) {
            return; // Interaction has already been responded to
        } else {
            return interaction.reply("An error occurred. Please report it to the GL/DGM.");
        }
    }
});

client.login(process.env.TOKEN);

function getStartOfWeek(date) {
    const day = date.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // Adjust to Monday if desired
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
}