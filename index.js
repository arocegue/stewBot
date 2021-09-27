const Discord = require("discord.js");
const client = new Discord.Client();
//const config = require("./config.json");
const ytdl = require("ytdl-core");
const ytSearch = require("yt-search");
const { MessageEmbed } = require("discord.js");
const { validateURL } = require("ytdl-core");
const ytpl = require("ytpl");
require("dotenv").config();
const prefix = `${process.env.prefix}`;
const musicQueue = new Map();

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
    j = k;
    const info = curr.map((song) =>
      `${++j}) [${song.title}](${song.url})`.join("\n")
    );
    const embed = new MessageEmbed().setDescription(
      `**[Current Song: ${queue[0].title}](${queue[0].url})**\n${info}`
    );
    queueList.push(embed);
  }

  return queueList;
};

const showQueue = async (args, serverQueue) => {
  if (!serverQueue) {
    args.channel.send(`**There is no active queue!**`);
    return;
  }
  let page = 0;
  const embeds = getQueueEmbed(serverQueue);
  const queueEmbed = await args.channel.send(
    `Current Page: ${currentPage + 1}/${embeds.length}`,
    embeds[currentPage]
  );
  await queueEmbed.react("⬅️");
  await queueEmbed.react("➡️");

  const filter = (reaction, user) => {
    ["⬅️", "➡️"].includes(reaction.emoji.name) && args.author.id == user.id;
  };
  const collector = queueEmbed.createReactionCollector({ filter, time: 20000 });
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

const playSong = async (args, serverQueue, message) => {
  let batch;
  let song = {};
  const author = args.member;
  const vC = author.voice.channel;
  if (!author.voice.channel) {
    args.reply("You need to be in a voice channel crackhead");
  } else {
    if (message[1].toLowerCase().includes("&list=")) {
      const listIdx = message[1].toLowerCase().indexOf("&list=");
      if (message[1].toLowerCase().includes("&index=")) {
        const listIdxTwo = message[1].toLowerCase().indexOf("&index=");
        batch = await ytpl(`${message[1].slice(listIdx + 6, listIdxTwo)}`);
      } else batch = await ytpl(`${message[1].slice(listIdx + 6)}`);
    } else if (validateURL(message[1])) {
      const song_info = await ytdl.getInfo(message[1]);
      song = {
        title: song_info.videoDetails.title,
        url: song_info.videoDetails.video_url,
      };
    } else {
      const video_finder = async (query) => {
        const videoResult = await ytSearch(query);
        return videoResult.videos.length > 1 ? videoResult.videos[0] : null;
      };
      const toSearch = args.content.toLowerCase().indexOf(" ");
      const video = await video_finder(
        args.content.toLowerCase().slice(toSearch, args.content.length) +
          " explicit"
      );
      if (video) {
        song = { title: video.title, url: video.url };
      } else {
        args.channel.send("Cant find the video");
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
      if (batch) {
        pushMultSongs(args, batch, queue_constructor);
      } else {
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
      if (batch) {
        pushMultSongs(args, batch, serverQueue);
      } else {
        pushSong(args, song, serverQueue);
      }
    }
  }
};

const pushSong = (args, song, serverQueue) => {
  serverQueue.songs.push(song);
  args.channel.send(`**${song.title}** was queued!`);
};

const pushMultSongs = (args, batch, serverQueue) => {
  let song = {};
  for (let i = 0; i < batch.items.length; ++i) {
    song = {
      title: batch.items[i].title,
      url: batch.items[i].shortUrl,
    };
    serverQueue.songs.push(song);
  }
  args.channel.send(`**Enqueued ${batch.items.length} songs**`);
};

const videoPlayer = async (guild, song) => {
  const songQueue = musicQueue.get(guild.id);
  if (!song) {
    songQueue.voice_channel.leave();
    musicQueue.delete(guild.id);
    return;
  }
  const stream = ytdl(song.url, { filter: "audioonly" });
  songQueue.connection.play(stream, { seek: 0 }).on("finish", () => {
    songQueue.songs.shift();
    videoPlayer(guild, songQueue.songs[0]);
  });
  await songQueue.message_channel.send(`**${song.title}** now playing`);
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
