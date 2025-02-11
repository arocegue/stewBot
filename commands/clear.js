const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue} = require('discord-player');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('clear')
		.setDescription('clear queue'),
	async execute(interaction) {
    
	},
	
};