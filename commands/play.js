const { SlashCommandBuilder } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;
const {useMainPlayer} = require('discord-player')

const player = useMainPlayer();
module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Play a youtube song')
		.addStringOption(option => option.setName('query').setDescription('youtube url')),
	async execute(interaction) {
		const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply('You are not connected to a voice channel!'); // make sure we have a voice channel
    const query = interaction.options.getString('query', true);
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
