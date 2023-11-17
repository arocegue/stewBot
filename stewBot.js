/*
const cls = require("./song.js");
const Discord = require("discord.js");
const client = new Discord.Client();
// const { Spotify } = require("spotify-web-api-js");
//const fs = require("fs");
const ytdl = require("ytdl-core");
const ytSearch = require("yt-search");
const { MessageEmbed } = require("discord.js");
const { validateURL } = require("ytdl-core");
const ytpl = require("ytpl");
require("dotenv").config();

//****************
const prefix = `${process.env.prefix}`;
const musicQueue = new Map();
let timeout = -1;
// const spotify = new Spotify({
//   clientId: `${process.env.clientid}`,
//   clientSecret: `${process.env.clientsecret}`,
//   defaultLimit: 150, // default track limit for playlist & album
// });
const sleep = (delay) => {
  return new Promise((resolve) => setTimeout(resolve, delay * 1000));
};
//***************
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("message", (args) => {
  const serverQueue = musicQueue.get(args.guild.id);
  const message = args.content.split(" ");
  if (
    message[0].toLowerCase() === prefix + "p" ||
    message[0].toLowerCase() === prefix + "play"
  ) {
    playSong(args, serverQueue, message);
  } else if (message[0] === prefix + "skip") {
    skipSong(args, serverQueue);
  } else if (message[0] === prefix + "stop") {
    stopSong(args, serverQueue);
  } else if (message[0] === prefix + "queue") {
    showQueue(args, serverQueue);
  } else if (message[0] === prefix + "help") {
  }
});

const getQueueEmbed = (serverQueue) => {
  let queueList = [];
  let k = 10;
  let j;
  let queue = serverQueue.songs;

  for (let i = 0; i < queue.length; i += 10) {
    const curr = queue.slice(i, k);
    k += 10;
    j = i;
    const info = curr
      .map((song) => `${++j}) [${song.title}](${song.url})`)
      .join("\n");
    const embed = new MessageEmbed().setDescription(
      `**[Current Song: ${queue[0].title}](${queue[0].url})**\n${info}`
    );
    queueList.push(embed);
  }

  return queueList;
};
const getEmoji = (args, em) => {
  return args.client.emojis.cache.find((emoji) => emoji.name === em);
};
const showQueue = async (args, serverQueue) => {
  if (!serverQueue || serverQueue.songs.length < 1) {
    args.channel.send(`**There is no active queue!**`);
    return;
  }
  let currentPage = 0;
  const embeds = getQueueEmbed(serverQueue);
  const queueEmbed = await args.channel.send(
    `Current Page: ${currentPage + 1}/${embeds.length}`,
    embeds[currentPage]
  );
  await queueEmbed.react("⬅️");
  await queueEmbed.react("➡️");
  const filter = (reaction, user) => {
    return (
      ["⬅️", "➡️"].includes(reaction.emoji.name) && args.author.id == user.id
    );
  };
  const collector = queueEmbed.createReactionCollector(filter, { time: 20000 });
  collector.on("collect", (reaction, user) => {
    if (reaction.emoji.name === "➡️") {
      currentPage < embeds.length - 1 && ++currentPage;
    } else if (reaction.emoji.name === "⬅️") {
      currentPage > 0 && --currentPage;
    }
    queueEmbed.edit(
      `Current Page: ${currentPage + 1}/${embeds.length}`,
      embeds[currentPage]
    );
    reaction.users.remove(user);
  });
};

const video_finder = async (query) => {
  const videoResult = await ytSearch(query);
  return videoResult.videos.length > 1 ? videoResult.videos[0] : null;
};

const playSong = async (args, serverQueue, message) => {
  let batch;
  const author = args.member;
  const vC = author.voice.channel;
  let spotty; //spotify
  if (!author.voice.channel) {
    args.reply(
      `You need to be in a voice channel crackhead ${getEmoji(args, "3x")}`
    );
  } else if (message.length < 2) {
    args.reply(`You need to provide a song airhead ${getEmoji(args, "KEKW")}`);
  } else {
    if (message[1].toLowerCase().includes("&list=")) {
      //Youtube
      const listIdx = message[1].toLowerCase().indexOf("&list=");
      if (message[1].toLowerCase().includes("&index=")) {
        const listIdxTwo = message[1].toLowerCase().indexOf("&index=");
        batch = await ytpl(`${message[1].slice(listIdx + 6, listIdxTwo)}`);
      } else batch = await ytpl(`${message[1].slice(listIdx + 6)}`);
    } else if (validateURL(message[1])) {
      //Youtube
      
      const song_info = await ytdl.getInfo(message[1]);
      
      song = new cls.song(
        song_info.videoDetails.title,
        song_info.videoDetails.video_url
      );
    } 
    // else if (Spotify.validate(message[1], "TRACK")) {
    //   const track = await spotify.getTrack(message[1]);
    //   const video = await video_finder(`${track} explicit`);
    //   if (video) {
    //     song = new cls.song(video.title, video.url);
    //   } else {
    //     args.channel.send("Cant find the video");
    //   }
    // } else if (Spotify.validate(message[1], "PLAYLIST")) {
    //   spotty = await spotify.getPlaylist(message[1]);
    // } else if (Spotify.validate(message[1], "ALBUM")) {
    //   spotty = await spotify.getAlbum(message[1]);
    // } 
    else {
      const toSearch = args.content.toLowerCase().indexOf(" ");
      const video = await video_finder(
        args.content.toLowerCase().slice(toSearch, args.content.length) +
          " explicit"
      );
      if (video) {
        song = new cls.song(video.title, video.url);
      } else {
        args.channel.send("Cant find the video");
        return;
      }
    }
    if (!serverQueue) {
      const queue_constructor = {
        voice_channel: vC,
        message_channel: args.channel,
        connection: null,
        songs: [],
      };
      musicQueue.set(args.guild.id, queue_constructor);
      timeout = -1;
      if (batch) {
        pushMultSongs(args, batch, queue_constructor);
      }// else if (spotty) {
      //   pushMultSpotSongs(args, spotty, queue_constructor);
      //   await sleep(3);
      // } 
      else {
        pushSong(args, song, queue_constructor);
      }
      try {
        const conn = await vC.join();
        queue_constructor.connection = conn;
        videoPlayer(args.guild, queue_constructor.songs[0]);
      } catch (err) {
        queue.delete(args.guild.id);
        args.reply("Cannot join your channel.");
        throw err;
      }
    } else {
      timeout !== -1 && clearTimeout(timeout);
      if (batch) {
        pushMultSongs(args, batch, serverQueue);
      } else if (spotty) {
        pushMultSpotSongs(args, spotty, serverQueue);
        await sleep(3);
      } else {
        pushSong(args, song, serverQueue);
      }
      if (timeout !== -1) {
        timeout = -1;
        videoPlayer(args.guild, serverQueue.songs[0]);
      }
    }
  }
};

const pushSong = (args, song, serverQueue) => {
  serverQueue.songs.push(song);
  args.channel.send(`**${song.title}** was queued!`);
};

const pushMultSongs = (args, batch, serverQueue) => {
  for (let i = 0; i < batch.items.length; ++i) {
    serverQueue.songs.push(
      new cls.song(batch.items[i].title, batch.items[i].shortUrl)
    );
  }
  args.channel.send(`**Enqueued ${batch.items.length} songs**`);
};

const pushMultSpotSongs = async (args, spotty, serverQueue) => {
  let count = 0;
  for (let i = 0; i < spotty.tracks.length; ++i) {
    const { title: gotTitle, url: gotURL } = await video_finder(
      `${spotty.tracks[i]} explicit`
    );
    if (gotTitle) {
      count++;
      serverQueue.songs.push(new cls.song(gotTitle, gotURL));
    }
  }
  args.channel.send(`**Enqueued ${count} songs**`);
};

const leaveVoice = function (songQueue, guild) {
  songQueue.voice_channel.leave();
  songQueue.message_channel.send(`**Currently Inactive**`);
  musicQueue.delete(guild.id);
};

const videoPlayer = async (guild, song) => {
  const songQueue = musicQueue.get(guild.id);
  if (!song) {
    timeout = setTimeout(leaveVoice.bind(null, songQueue, guild), 240 * 1000);
    return;
  }
  const stream = ytdl(song.url, {
    filter: "audioonly",
    quality: "highestaudio",
  }).on("error", (err) => {
    console.log("Error Occured: \n", err);
    //videoPlayer(guild, songQueue.songs[0]);
    songQueue.songs.shift();
    videoPlayer(guild, songQueue.songs[0]);
  });
  songQueue.connection.play(stream, { seek: 0 }).on("finish", () => {
    songQueue.songs.shift();
    videoPlayer(guild, songQueue.songs[0]);
  });
  await songQueue.message_channel.send(
    new MessageEmbed().setDescription(
      `**[Now Playing: ${song.title}](${song.url})**`
    )
  );
};

const skipSong = (message, serverQueue) => {
  if (!message.member.voice.channel)
    return message.channel.send("You need to be in a voice channel");
  if (!serverQueue) {
    return message.channel.send("No songs in the queue!");
  }
  serverQueue.connection.dispatcher.end();
};

const stopSong = (message, serverQueue) => {
  if (!message.member.voice.channel)
    return message.channel.send("You need to be in a voice channel");
  if (!serverQueue) {
    return message.channel.send("No songs in the queue!");
  }
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
};

client.login(process.env.token);

*/


const fs = require('node:fs');
const path = require('node:path');
const { Player } = require('discord-player');
const { Client, Events, Collection, GatewayIntentBits, ReactionCollector } = require('discord.js');
require('dotenv').config()



const client = new Client({ intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMessageReactions
] });


client.commands = new Collection();
client.cooldowns = new Collection()
client.player = new Player(client, {
  ytdlOptions: {
    quality: "highestaudio",
    highWaterMark: 1 << 25,
  },
});
client.player.extractors.loadDefault();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

const eventFolders = fs.readdirSync(path.resolve('./events'))

for (const folder of eventFolders) {
  const eventFiles = fs.readdirSync(path.resolve(`./events/${folder}`)).filter(file => file.endsWith('.js'));
  for(const file of eventFiles){
    const event = require(`./events/${folder}/${file}`);
    if(folder == 'client'){
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }
    }else if (folder == 'player'){
      client.player.events.on(event.name, (...args) => event.execute(...args));
    }
  }
}

client.login(process.env.token);
