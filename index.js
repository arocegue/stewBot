const Discord = require("discord.js");
const client = new Discord.Client();
//const config = require("./config.json");
const ytdl = require("ytdl-core");
const ytSearch = require("yt-search");
const { validateURL } = require("ytdl-core");
const ytpl = require("ytpl");
require("dotenv").config();
const prefix = `${process.env.prefix}`;
const musicQueue = new Map();

function queueMultSongs(arg) {}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("message", async (args) => {
  const serverQueue = musicQueue.get(args.guild.id);
  const message = args.content.split(" ");
  const author = args.member;
  const vC = author.voice.channel;
  let batch;
  let song = {};
  if (
    message[0].toLowerCase() === prefix + "p" ||
    message[0].toLowerCase() === prefix + "play"
  ) {
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
          for (let i = 0; i < batch.items.length; ++i) {
            song = {
              title: batch.items[i].title,
              url: batch.items[i].shortUrl,
            };
            queue_constructor.songs.push(song);
          }
          args.channel.send(`**Enqueued ${batch.items.length} songs**`);
        } else {
          queue_constructor.songs.push(song);
          args.channel.send(`**${song.title}** was queued!`);
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
          for (let i = 0; i < batch.items.length; ++i) {
            song = {
              title: batch.items[i].title,
              url: batch.items[i].shortUrl,
            };
            serverQueue.songs.push(song);
          }
          args.channel.send(`**Enqueued ${batch.items.length} songs**`);
        } else {
          serverQueue.songs.push(song);
          args.channel.send(`**${song.title}** was queued!`);
        }
      }
    }
  } else if (message[0] === prefix + "skip") {
    skipSong(args, serverQueue);
  } else if (message[0] === prefix + "stop") {
    stopSong(args, serverQueue);
  }
});

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
  await songQueue.message_channel.send(`${song.title} now playing`);
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
