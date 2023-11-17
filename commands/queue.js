const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue} = require('discord-player');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('queue')
		.setDescription('View the queue'),
	async execute(interaction) {

		const getQueueEmbed = (serverQueue, currentTrack) => {
			let queueList = [];
			let k = 10;
			let j;
			let queue = serverQueue;
		
			for (let i = 0; i < queue.length; i += 10) {
				const curr = queue.slice(i, k);
				k += 10;
				j = i;
				const info = curr
					.map((song) => `${++j}) [${song.title}](${song.url}) (${song.duration})`)
					.join("\n");
				const embed = new EmbedBuilder()
				.setTitle("Stewbot Song Queue")
				.setDescription(
					`**[Current Song: ${currentTrack.title}](${currentTrack.url})**\n${info}`
				)
				.setThumbnail(`${currentTrack.thumbnail}`);
				queueList.push(embed);
			}
		
			return queueList;
		};

		const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply('You are not connected to a voice channel!'); // make sure we have a voice channel
		try{
      await interaction.deferReply({ ephemeral: false });
      const queue = useQueue(interaction.guild.id);
			const getTracksObj = queue?.tracks?.data;
      if(!queue || !getTracksObj){
        return interaction.followUp("There is no active tracks in the current queue.")
      }
			const currentTrack = {
				title: queue?.currentTrack?.title,
				url: queue?.currentTrack?.url,
				duration: queue?.currentTrack?.duration,
				thumbnail: queue?.currentTrack?.thumbnail
			}
			const queuedTracks =  getTracksObj.map((elem) => {
				return {
					title: elem.title,
					url: elem.url,
					duration: elem.duration
				}
			})
			const embeds = getQueueEmbed(queuedTracks, currentTrack)


			let currentPage = 0;
			const queueEmbed = await interaction.editReply({content:`Current Page: ${currentPage + 1}/${embeds.length}`, embeds: [embeds[currentPage]]}
			);
			await queueEmbed.react("⬅️");
			await queueEmbed.react("➡️");
			const filter = (reaction, user) => {
				return (
					["⬅️", "➡️"].includes(reaction.emoji.name) && interaction.user.id === user.id
				);
			};
			const collector = queueEmbed.createReactionCollector(filter,{ time: 20000 });
			collector.on("collect", (reaction, user) => {
				if (reaction.emoji.name === "➡️") {
					currentPage < embeds.length - 1 && ++currentPage;
				} else if (reaction.emoji.name === "⬅️") {
					console.log("HereLeft")
					currentPage > 0 && --currentPage;
				}
				interaction.editReply(
					{content: `Current Page: ${currentPage + 1}/${embeds.length}`,
					embeds: [embeds[currentPage]]}
				);
				reaction.users.remove(user)
			});
		}catch (e){
			return interaction.followUp(`Something went wrong: ${e}`)
		}
	},
	
};