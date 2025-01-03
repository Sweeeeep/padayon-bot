require('dotenv').config();
const { Client, GatewayIntentBits, Events, PermissionsBitField, AttachmentBuilder } = require('discord.js');
const { getWelcomeMessage, setWelcomeMessage, getGoogleSheetLink, setGoogleSheetLink, clearGoogleSheetLink } = require('./firebase/firestoreService');
const axios = require('axios');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const Redis = require('ioredis');

const { addJob } = require('./jobs');
const registerCommands = require('./commands/registerCommands');
const redis = new Redis();  // Create a new Redis client

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


// Subscribe to the job queue
redis.subscribe('jobCompletion', (err, count) => {
    if (err) {
        console.error('Failed to subscribe:', err);
    } else {
        console.log('Subscribed to jobCompletion channel');
    }
});

// Handle messages from the jobCompletion channel
redis.on('message', async (channel, message) => {
    if (channel === 'jobCompletion') {
        try {
            const location = {
                tigdal: 'Masarta Ice Cavern Cave 1 - Tigdal',
                gatphillian: 'Masarta Ice Cavern Cave 2 - Gatphillian',
                modi: 'Masarta Ice Cavern Cave 3 - Modi',
                hotura: 'Masarta Ice Cavern Cave 3 - Hotura',
                stormid: 'Masarta Ice Cavern Cave 4 - Stormid',
                panderre: 'Masarta Ice Cavern Cave 4 - Panderre',
                maltanis: 'Masarta Ice Cavern Cave 5 - Malantis',
                dardaloca: 'Masarta Ice Cavern Cave 6 - Dardaloca',
                hakir: 'Masarta Eerie Rock Sanctuary Region 2 - Hakir',
                damiross: 'Masarta Eerie Rock Sanctuary Region 3 - Damiross',
                kafka: 'Masarta Eerie Rock Sanctuary Region 4 - Kafka',
                kod: 'Kildebat - Knight of Death',
                rk: 'Kildebat of Chaos - Ruined Knight'
            }

            const jobResult = JSON.parse(message);
            // Fetch the guild (server) using its ID
            const guild = await client.guilds.fetch(jobResult.guildId);

            // Fetch the channel using its ID
            const channel = await guild.channels.fetch(jobResult.channelId);
            
            // await channel.send(jobResult.matching_names.join(','));
            console.log('Job completed with result:', jobResult);

            const image = new AttachmentBuilder(path.join(jobResult.imagePath))

            const capitalizeFirstLetter = (string) => {
                if (!string) return string;
                return string.charAt(0).toUpperCase() + string.slice(1);
            };
            
            const resultMessage = `**🏆 Cave Boss: ${capitalizeFirstLetter(jobResult.interactionOptions.location)} Defeated! 🏆**
🎮 **Participants:** (${jobResult.matching_names.length} players)
${jobResult.matching_names.map((player, index) => `**${index + 1}.** ${player}`).join('\n')}

🗓️ **Date & Time:** ${jobResult.interactionOptions.datetime}
⚔️ **Activity Type:** ${jobResult.interactionOptions.type}
🎯 **Location:** ${location[jobResult.interactionOptions.location]}

Great job, team! 💪🔥`;

            await channel.send({
                content: resultMessage,
                files: [image]
            }).then(async function (){
                const data = jobResult.matching_names.map(value => ({
                    "DATE": jobResult.interactionOptions.datetime,
                    "IGN": value,
                    "LOCATION": capitalizeFirstLetter(jobResult.interactionOptions.location),
                    "TYPE": jobResult.interactionOptions.type
                }));

                const googleSheetLink = await getGoogleSheetLink(jobResult.guildId);
            
                const insertResponse = await axios.post(`${process.env.SHEET_GOOGLE_SCRIPT_URL}?sheetId=${googleSheetLink}&sheetName=RAWDATA-CAVE-ATTENDANCE`, JSON.stringify(data), {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                console.log('The list of names has been successfully added to the Google Sheet.')
                
                if (fs.existsSync(jobResult.imagePath)) {
                    fs.unlinkSync(jobResult.imagePath);
                }
            });
            // Handle job completion result as needed
        } catch (e) {
            console.error('Error parsing job completion message:', e);
        }
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'setgooglesheetlink') {
        if (!interaction.member.permissionsIn(interaction.channel).has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: "You must be an administrator to perform this action.", ephemeral: true });
            return;
        }

        const link = interaction.options.getString('link');
        const sheetId = (link.match(/\/d\/([a-zA-Z0-9_-]+)\/edit/) || [])[1];

        if (sheetId === undefined) {
            await interaction.reply({ content: "Error: Invalid URL format. Unable to extract the Sheet ID.", ephemeral: true });
            return;
        }

        const existingLink = await getGoogleSheetLink(interaction.guild.id);

        if (existingLink) {
            await clearGoogleSheetLink(interaction.guild.id);
            await setGoogleSheetLink(interaction.guild.id, sheetId);
            await interaction.reply({ content: `Google Sheets link was reset and set to: ${link}`, ephemeral: true });
        } else {
            await setGoogleSheetLink(interaction.guild.id, sheetId);
            await interaction.reply({ content: `Google Sheets link set to: ${link}`, ephemeral: true });
        }
    }

    if (commandName === 'attendance') {
        if (interaction.replied || interaction.deferred) return;

        await interaction.deferReply();

        const attachment = interaction.options.getAttachment('screenshot');
        const googleSheetLink = await getGoogleSheetLink(interaction.guild.id);

        if (googleSheetLink === null) {
            await interaction.editReply({ content: 'Please contact the server admin to set up the bot.', ephemeral: true });
            return;
        }

        const checkUrl = `${process.env.SHEET_GOOGLE_SCRIPT_URL}?sheetId=${googleSheetLink}&sheetName=RAWDATA-MEMBERS&listColumn=IGN`;

        let namesJson;
        try {
            const checkResponse = await axios.get(checkUrl);
            namesJson = checkResponse.data;
        } catch (error) {
            await interaction.editReply('Failed to fetch names list from Google Sheets.');
            console.error('Google Sheets request error:', error);
            return;
        }

        if (!attachment) {
            await interaction.editReply({ content: 'Please attach a screenshot.', ephemeral: true });
            return;
        }

        const fileName = Date.now() + interaction.guildId + '.png';
        const filePath = path.join(__dirname, fileName);

        try {
            const response = await fetch(attachment.url);
            const buffer = await response.buffer();
            fs.writeFileSync(filePath, buffer);

            const data = { filePath : filePath, namesJson: JSON.stringify(namesJson) }
            const optionsJson = {
                datetime: interaction.options.getString('datetime'),
                type: interaction.options.getString('type'),
                location: interaction.options.getString('location')
            };

            await addJob(interaction.channelId, interaction.guildId, data, optionsJson);
            console.log('Job added to queue!');

            await interaction.editReply({ content: 'Your image is being processed. I will notify you once done.', ephemeral: true });

        } catch (error) {
            await interaction.editReply('An unexpected error occurred while processing the image.');
            console.error('Error handling image:', error);
        }
    }

    if (commandName === 'ping') {
        return interaction.reply({ content: 'pong', ephemeral: true });
    }

    if (commandName === 'update-stats') {
        const options = ['ign', 'guild', 'lvl', 'gr', 'dmg', 'acc', 'def'].reduce((acc, key) => {
            acc[key] = interaction.options.get(key)?.value;
            return acc;
        }, {});

        const { ign, lvl, gr, dmg, acc, def } = options;
        const user = interaction.member.nickname || interaction.member.user.username;

        const googleSheetLink = await getGoogleSheetLink(interaction.guild.id);

        if (googleSheetLink === null) {
            await interaction.reply({ content: `Please contact the server admin to set up the bot.`, ephemeral: true });
            return;
        }

        try {
            if (interaction.replied || interaction.deferred) return;
            
            await interaction.deferReply();

            try {
                const checkUrl = `${process.env.SHEET_GOOGLE_SCRIPT_URL}?sheetId=${googleSheetLink}&sheetName=RAWDATA-STATS&column=IGN&search=${ign}`;
                const checkResponse = await axios.get(checkUrl);

                const lastEntry = checkResponse.data.sort((a, b) => new Date(b.DATE) - new Date(a.DATE))[0];

                if (lastEntry !== undefined) {
                    const timeZone = 'Asia/Manila';
                    const currentDate = moment().tz(timeZone);
                
                    const lastEntryDate = moment(lastEntry.DATE).tz(timeZone);
                    const startOfCurrentWeek = moment().tz(timeZone).startOf('isoWeek');
                    const endOfCurrentWeek = moment().tz(timeZone).endOf('isoWeek');
                
                    if (lastEntryDate.isBetween(startOfCurrentWeek, endOfCurrentWeek, null, '[]')) {
                        if (interaction.deferred) {
                            return interaction.editReply({ content: `Your progress data has already been added this week. Please wait until next week to update it.`, ephemeral: true });
                        } else {
                            return interaction.reply({ content: `Your progress data has already been added this week. Please wait until next week to update it.`, ephemeral: true });
                        }
                    } 
                }
            } catch (error) {
                console.error('Error:', error.message);
                if (interaction.deferred) {
                    return interaction.editReply({ content: `Your progress data has already been added this week. Please wait until next week to update it.`, ephemeral: true });
                } else {
                    return interaction.reply({ content: `Your progress data has already been added this week. Please wait until next week to update it.`, ephemeral: true });
                }
            }

            const searchUrl = `${process.env.SHEET_GOOGLE_SCRIPT_URL}?sheetId=${googleSheetLink}&sheetName=RAWDATA-MEMBERS&column=IGN&search=${ign}`;
            const searchResponse = await axios.get(searchUrl);

            if (searchResponse.data.length === 0) {
                if (interaction.deferred) {
                    return interaction.editReply({ content: "Unable to find your IGN in the records. Please contact your GL/DGM.", ephemeral: true });
                } else {
                    return interaction.reply({ content: "Unable to find your IGN in the records. Please contact your GL/DGM.", ephemeral: true });
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

            if (interaction.deferred) {
                return interaction.editReply({ content: "Thank you for submitting the details of your character!", ephemeral: true });
            } else {
                return interaction.reply({ content: "Thank you for submitting the details of your character!", ephemeral: true });
            }
        } catch (error) {
            console.error('Error handling interaction:', error);
            if (interaction.deferred) {
                return interaction.editReply({ content: "An error occurred. Please report it to the GL/DGM.", ephemeral: true });
            } else if (interaction.replied) {
                return;
            } else {
                return interaction.reply({ content: "An error occurred. Please report it to the GL/DGM.", ephemeral: true });
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
    await registerCommands(guild.id);
});

client.login(process.env.TOKEN);

