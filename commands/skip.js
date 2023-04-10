const { SlashCommandBuilder } = require('discord.js');
const { useQueue} = require('discord-player');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('Skip current song from the queue'),
	async execute(interaction) {
		const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply('You are not connected to a voice channel!'); // make sure we have a voice channel
		try{
      await interaction.deferReply({ ephemeral: false });
      const queue = useQueue(interaction.guild.id);
      if(!queue){
        return interaction.followUp("There is nothing in the queue.")
      }
      const skippedTrack = queue.currentTrack
      queue.node.skip()
      return interaction.followUp(`${skippedTrack.title} was skipped from the queue`)
		}catch (e){
			return interaction.followUp(`Something went wrong: ${e}`)
		}
	},
	
};