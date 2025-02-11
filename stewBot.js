const fs = require('node:fs');
const path = require('node:path');
const { Player } = require('discord-player');
const { YoutubeiExtractor, createYoutubeiStream } = require('discord-player-youtubei');

const { Client, Events, Collection, GatewayIntentBits, ReactionCollector } = require('discord.js');
const { DefaultExtractors } = require('@discord-player/extractor');
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
client.player = new Player(client);
// const oauthTokens = getOauthTokens()
client.player.on('debug', (msg) => console.log(msg))
client.player.extractors.register(YoutubeiExtractor, {
  streamOptions: {
    useClient: "ANDROID",
  },
  // authentication: "access_token=ya29.a0AcM612wzii46RtCWuJXgOshQNbanYJFtuhJDv3d5r6OJUMwuLd9roqo5NsSofwG7qtKZ9Ob5bYLgQe8KU4O2zzKzc7OEeOgWeT_NVp030KQFB2gPAQJRhAbTzcE-pUydUtEJ1jzB1prM9RospRLf2ImENHiX2qqR52a5YJNBrLZmY10UWf7XaCgYKASUSARISFQHGX2Mi0ryxD3P-l0oRSaQE6RidYg0187; refresh_token=1//06UWUuWC-2NJICgYIARAAGAYSNwF-L9Ir49GLuiveJA23iEV1zJ1vhxDE3Hpw0E3zpdYNME186U89aAEd7SzonllZ9TUbTXvIvZU; scope=https://www.googleapis.com/auth/youtube-paid-content https://www.googleapis.com/auth/youtube; token_type=Bearer; expiry_date=2024-09-18T19:18:14.371Z"
});
// client.player.extractors.register(SpotifyExtractor, {
//   createStream: createYoutubeiStream
// })
client.player.extractors.loadMulti(DefaultExtractors);
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
