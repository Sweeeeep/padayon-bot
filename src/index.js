require('dotenv').config();

const { storeData, InitializeFirebaseApp } = require('./firebase');
const { Client, GatewayIntentBits, Events, PermissionsBitField } = require('discord.js');
const { getWelcomeMessage, setWelcomeMessage, getGoogleSheetLink, setGoogleSheetLink, clearGoogleSheetLink } = require('./firebase/firestoreService');

const axios = require('axios');
const moment = require('moment-timezone');

const registerCommands = require('./commands/registerCommands');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});


client.on('ready', async (c) => {
    console.log(`✅ ${c.user.tag} is online`);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if(commandName == 'setgooglesheetlink'){
        if(!interaction.member.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.Administrator)){
            await interaction.reply({ content : "You must be an administrator to perform this action.", ephemeral:true });
            return;
        }

        const link = interaction.options.getString('link');
        const match = link.match(/\/d\/([a-zA-Z0-9_-]+)\/edit/);

        if (!match) {
            await interaction.reply({ content : "Error: Invalid URL format. Unable to extract the Sheet ID.", ephemeral:true });
            return;
        }
        const existingLink = await getGoogleSheetLink(interaction.guild.id);

        if (existingLink) {
            // Clear the old link before setting the new one
            await clearGoogleSheetLink(interaction.guild.id);
            await setGoogleSheetLink(interaction.guild.id, match[1]);
            await interaction.reply({ content : `Google Sheets link was reset and set to: ${link}`, ephemeral: true });
        } else {
            await setGoogleSheetLink(interaction.guild.id, link);
            await interaction.reply({ content : `Google Sheets link set to: ${link}`, ephemeral: true });
        }
    }


    if (commandName === 'ping') {
        return interaction.reply({ content: 'pong', ephemeral: true });
    }

    if( commandName === 'update-stats'){
        const options = ['ign', 'guild', 'lvl', 'gr', 'dmg', 'acc', 'def'].reduce((acc, key) => {
            acc[key] = interaction.options.get(key)?.value;
            return acc;
        }, {});

        const { ign, lvl, gr, dmg, acc, def } = options;
        const user = interaction.member.nickname || interaction.member.user.username;

        const googleSheetLink = await getGoogleSheetLink(interaction.guild.id)

        if(googleSheetLink === null){
            await interaction.reply({ content : `Please contact the server admin to set up the bot.`, ephemeral: true });
            return;
        }

        try {
            // Check if the interaction has already been acknowledged
            if (interaction.replied || interaction.deferred) return;
            
            await interaction.deferReply(); // Defer the reply to avoid timeout issues

            try {
                const checkUrl = `${process.env.SHEET_GOOGLE_SCRIPT_URL}?sheetId=${googleSheetLink}&sheetName=RAWDATA-STATS&column=IGN&search=${ign}`;
                const checkResponse = await axios.get(checkUrl);


                const lastEntry = checkResponse.data.sort((a, b) => new Date(b.DATE) - new Date(a.DATE))[0];

                console.log(lastEntry)

                if(lastEntry !== undefined){
                    const timeZone = 'Asia/Manila'; // Specify the desired timezone
                    const currentDate = moment().tz(timeZone);
                
                    const lastEntryDate = moment(lastEntry.DATE).tz(timeZone);
                    const startOfCurrentWeek = moment().tz(timeZone).startOf('isoWeek'); // Start of the week (Monday) in timezone
                    const endOfCurrentWeek = moment().tz(timeZone).endOf('isoWeek');     // End of the week (Sunday) in timezone
                
                    if (lastEntryDate.isBetween(startOfCurrentWeek, endOfCurrentWeek, null, '[]')) {
                        if (interaction.deferred) {
                            return interaction.followUp({ content : `Your progress data has already been added this week. Please wait until next week to update it.`, ephemeral: true });
                        } else {
                            return interaction.reply({ content : `Your progress data has already been added this week. Please wait until next week to update it.`, ephemeral: true });
                        }
                    } 
                }
            } catch (error) {
                console.error('Error:', error.message);
                if (interaction.deferred) {
                    return interaction.followUp({ content : `Your progress data has already been added this week. Please wait until next week to update it.`, ephemeral: true });
                } else {
                    return interaction.reply({ content : `Your progress data has already been added this week. Please wait until next week to update it.`, ephemeral: true });
                }
            }

            const searchUrl = `${process.env.SHEET_GOOGLE_SCRIPT_URL}?sheetId=${googleSheetLink}&sheetName=RAWDATA-MEMBERS&column=IGN&search=${ign}`;
            const searchResponse = await axios.get(searchUrl);

            if (searchResponse.data.length === 0) {
                // Check if the interaction is still valid before trying to edit the reply
                if (interaction.deferred) {
                    return interaction.followUp({ content : "Unable to find your IGN in the records. Please contact your GL/DGM.", ephemeral: true });
                } else {
                    return interaction.reply({ content : "Unable to find your IGN in the records. Please contact your GL/DGM.", ephemeral: true });
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

            const insertResponse = await axios.post(`${process.env.SHEET_GOOGLE_SCRIPT_URL}?sheetId=${googleSheetLink}&sheetName=RAWDATA-STATS&row=2`, JSON.stringify(postData), {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            // Check if the interaction is still valid before trying to edit the reply
            if (interaction.deferred) {
                return interaction.followUp({ content : "Thank you for submitting the details of your character!", ephemeral: true });
            } else {
                return interaction.reply({ content : "Thank you for submitting the details of your character!", ephemeral: true });
            }
        } catch (error) {
            console.error('Error handling interaction:', error);
            // Handle errors when interaction may have expired
            if (interaction.deferred) {
                return interaction.followUp({ content : "An error occurred. Please report it to the GL/DGM.", ephemeral: true });
            } else if (interaction.replied) {
                return; // Interaction has already been responded to
            } else {
                return interaction.reply({ content : "An error occurred. Please report it to the GL/DGM.", ephemeral: true});
            }
        }
    }
});

client.on(Events.ClientReady, (c) => {
    console.log(`✅ ${c.user.tag} is online`);

    client.guilds.cache.forEach(async guild => {
        await registerCommands(guild.id);
    });
});


client.on(Events.GuildCreate, async guild => {
    console.log(`Joined a new server: ${guild.name}`);
    await registerCommands(guild.id); // Register commands for the new server
});


client.login(process.env.TOKEN);
