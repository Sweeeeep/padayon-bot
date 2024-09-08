require('dotenv').config()
const { REST, Routes, ApplicationCommandOptionType } = require('discord.js')

const commands = [
    {
        name:'ping',
        description: 'replies pong'
    }, {
        name: 'update-stats',
        description : 'Update Character Stats',
        options: [
            {
                name: 'guild',
                description: 'Guild',
                type: ApplicationCommandOptionType.String,
                choices: [
                    {
                        name: 'MostCrimePh',
                        value: 'MostCrimePh'
                    }, {
                        name: 'PHUBLabanan', 
                        value: 'PHUBLabanan'
                    }, {
                        name: 'TIPSYPH',
                        value: 'TIPSYPH'
                    }, {
                        name: 'Apex',
                        value: 'Apex'
                    }
                ],
                required: true,
            }, {
                name: 'ign',
                description: 'Ingame Name',
                type: ApplicationCommandOptionType.String,
                required: true,
            }, {
                name: 'lvl',
                description: 'Current LVL',
                type: ApplicationCommandOptionType.Number,
                required: true,
            }, {
                name: 'gr',
                description: 'Current Growth Rate',
                type: ApplicationCommandOptionType.Number,
                required: true,
            }, {
                name: 'dmg',
                description: 'Current Damage with buffs',
                type: ApplicationCommandOptionType.Number,
                required: true,
            }, {
                name: 'acc',
                description: 'Current Accuracy with buffs',
                type: ApplicationCommandOptionType.Number,
                required: true,
            }, {
                name: 'def',
                description: 'Current Defense with buffs',
                type: ApplicationCommandOptionType.Number,
                required: true,
            }
        ]
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async() => {
    try {
        console.log('Registering slash commands...');
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands}
        )
        console.log('Slash commands were registered successfully!');
    } catch (error) {
        console.log(`There was an error: ${error}`);
    }
})();