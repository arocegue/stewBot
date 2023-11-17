const { SlashCommandBuilder } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;
const {useMainPlayer} = require('discord-player')
// const { SlashCommandBuilder } = require('discord.js');
// const { useQueue} = require('discord-player');



// module.exports = {
//   data: new SlashCommandBuilder()
//         .setName('leave')
//         .setDescription('Destroy current queue and leave the voice channel')
// }
const player = useMainPlayer();
module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Play a youtube song')
		.addStringOption(option => option.setName('query').setDescription('youtube url')),
	async execute(interaction) {
		const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply('You are not connected to a voice channel!'); // make sure we have a voice channel
    const query = interaction.options.getString('query', false);
		if(!query) return interaction.reply('Please enter a query for a song.');
		await interaction.deferReply({ ephemeral: false });
		try{
			const {track} = await player.play(channel, query, {
				nodeOptions: {
					metadata: interaction
				}
			});
			interaction.followUp(`**${track.title}** enqueued!`);
		}catch (e){
			return interaction.followUp(`Something went wrong: ${e}`)
		}
	},
	
};
