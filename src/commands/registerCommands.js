require('dotenv').config()
const { REST, Routes, ApplicationCommandOptionType } = require('discord.js')

const commands = [
    {
        name:'ping',
        description: 'replies pong'
    }, {
        name: 'update-stats',
        description: 'Update character stats for tracking progress',
        options: [
            {
                name: 'ign',
                description: 'The in-game name of the character (case sensitive)',
                type: ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name: 'lvl',
                description: 'The character\'s current level',
                type: ApplicationCommandOptionType.Number,
                required: true,
            },
            {
                name: 'gr',
                description: 'The character\'s current growth rate',
                type: ApplicationCommandOptionType.Number,
                required: true,
            },
            {
                name: 'dmg',
                description: 'The character\'s current total damage output with buffs',
                type: ApplicationCommandOptionType.Number,
                required: true,
            },
            {
                name: 'acc',
                description: 'The character\'s current accuracy with buffs applied',
                type: ApplicationCommandOptionType.Number,
                required: true,
            },
            {
                name: 'def',
                description: 'The character\'s current defense stat with buffs applied',
                type: ApplicationCommandOptionType.Number,
                required: true,
            }
        ]
    }, {
        name: 'setgooglesheetlink',
        description: 'Sets the Google Sheets link for character progress logs',
        options: [
            {
                name: 'link',
                type: ApplicationCommandOptionType.String, // STRING
                description: 'The Google Sheets URL for character progress logs',
                required: true,
            },
        ],
    },
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

async function registerCommands(guildId) {
    try {
        console.log(`Started refreshing application (/) commands for guild: ${guildId}`);

        await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), {
            body: commands,
        });

        console.log(`Successfully reloaded application (/) commands for guild: ${guildId}`);
    } catch (error) {
        console.error(`Failed to register commands for guild: ${guildId}`, error);
    }
}

module.exports = registerCommands;
