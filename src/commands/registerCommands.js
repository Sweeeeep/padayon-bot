require('dotenv').config()
const { REST, Routes, ApplicationCommandOptionType } = require('discord.js')

const commands = [
    {
        name:'ping',
        description: 'replies pong'
    },{
        name:'attendance',
        description: 'Add attendance by providing a screenshot of players in the cave',
        options: [
            {
                name: 'screenshot',
                description: 'Upload the screenshot showing players in the cave.',
                type: ApplicationCommandOptionType.Attachment,
                required: true,
            },{
                name: 'datetime',
                description: 'Date and time when the screenshot was taken (format: M/D/YYYY H:m, 24-hour format)',
                type: ApplicationCommandOptionType.String,
                required: true,
            },{
                name: 'type',
                description: 'Specify the type of activity (Attack/Contest, Defend, Help, Take).',
                type: ApplicationCommandOptionType.String,
                choices: [
                    {
                        name: 'Attack/Contest',
                        value: 'Attack/Contest'
                    },{
                        name: 'Defend/Help',
                        value: 'Defend/Help'
                    },{
                        name: 'Take',
                        value: 'Take'
                    },
                ],
                required: true,
            },{
                name: 'location',
                description: 'Select the cave or region where the boss was located.',
                type: ApplicationCommandOptionType.String,
                choices: [
                    {
                        name: 'Masarta Ice Cavern Cave 1 Tigdal',
                        value: 'tigdal'
                    }, {
                        name: 'Masarta Ice Cavern Cave 2 Gatphillian', 
                        value: 'gatphillian'
                    }, {
                        name: 'Masarta Ice Cavern Cave 3 Modi',
                        value: 'modi'
                    }, {
                        name: 'Masarta Ice Cavern Cave 3 Hotura',
                        value: 'hotura'
                    }, {
                        name: 'Masarta Ice Cavern Cave 4 Stormid',
                        value: 'stormid'
                    }, {
                        name: 'Masarta Ice Cavern Cave 4 Panderre',
                        value: 'panderre'
                    }, {
                        name: 'Masarta Ice Cavern Cave 5 Maltanis',
                        value: 'maltanis'
                    }, {
                        name: 'Masarta Ice Cavern Cave 6 Dardaloca',
                        value: 'dardaloca'
                    }, {
                        name: 'Masarta Eerie Rock Sanctuary Region 2 Hakir',
                        value: 'hakir'
                    }, {
                        name: 'Masarta Eerie Rock Sanctuary Region 3 Damiross',
                        value: 'damiross'
                    }, {
                        name: 'Masarta Eerie Rock Sanctuary Region 4 Kafka',
                        value: 'kafka'
                    }, {
                        name: 'Knight of Death',
                        value: 'kod'
                    }, {
                        name: 'Ruined Knight',
                        value: 'rk'
                    }
                ],
                required: true,
            }
        ]
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
