const { SlashCommandBuilder } = require('discord.js');
const { useQueue} = require('discord-player');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('Skip current song from the queue')
		.addStringOption(option => option.setName('position').setDescription('track position')),
	async execute(interaction) {
		const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply('You are not connected to a voice channel!'); // make sure we have a voice channel
		const position = interaction.options.getString('position', false);
		try{
      await interaction.deferReply({ ephemeral: false });
      const queue = useQueue(interaction.guild.id);
      if(!queue){
        return interaction.followUp("There is nothing in the queue.")
      }
			let skippedTrack = {}
			if (!position){
      	skippedTrack = queue.currentTrack;
      	queue.node.skip();
			}else{
				let pos = parseInt(position);
				skippedTrack = queue.removeTrack(pos - 1)
			}
      return interaction.followUp(`**${skippedTrack.title}** was skipped from the queue`)
		}catch (e){
			return interaction.followUp(`Something went wrong: ${e}`)
		}
	},
	
};