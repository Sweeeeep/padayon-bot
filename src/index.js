require('dotenv').config();

const { storeData,InitializeFirebaseApp } = require('./firebase')

const {Client, IntentsBitField} = require('discord.js');

const axios = require('axios');


const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ]
})

client.on('ready', async (c) => {
    InitializeFirebaseApp();
    console.log(`✅ ${c.user.tag} is online`)
    // await storeData();
});

client.on('interactionCreate', async (interaction) => {
    if(!interaction.isChatInputCommand()) return;

    // console.log(interaction);
    if(interaction.commandName == 'ping'){
        interaction.reply({
            content: 'pong',
            ephemeral: true
        });
    }
    // console.log(interaction.member.nickname ?? interaction.member.user.username);
    // Function to calculate the next spawn time based on the boss type

    const options = ['ign', 'guild', 'lvl', 'gr', 'dmg', 'acc', 'def'].reduce((acc, key) => {
        acc[key] = interaction.options.get(key)?.value;
        return acc;
      }, {});
      
    const { ign, guild, lvl, gr, dmg, acc, def } = options;
    const user = interaction.member.nickname || interaction.member.user.username;


    axios.get(process.env.SHEET_DB_API + '/search?IGN=' + ign + '&sheet=RAWDATA-MEMBERS').then(function (response){

        if(response.data.length === 0){
            interaction.reply("Unable to find your IGN in the records. Please contact your GL/DGM.");
            return;
        }

        axios.post(process.env.SHEET_DB_API, {
            DATE: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
            IGN: ign,
            LVL: lvl,
            GR: gr,
            DMG: dmg,
            DEF: def,
            ACC: acc,
            DISCORD: user,
            sheet: 'RAWDATA-STATS'
        }, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
        .then(function (response) {
            interaction.reply("Thank you for submitting the details of your character!");
        })
        .catch(function (error) {
            interaction.reply("An error occurred. Please report it to the GL/DGM.");
        });
    })

})

client.login(process.env.TOKEN);
