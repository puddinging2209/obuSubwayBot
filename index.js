require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

// botのクライアントを作成
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// 起動時の処理
client.on('clientReady', () => {
	console.log(`Logged in as ${client.user.tag}!`);
});

// メッセージを受け取ったとき
client.on('messageCreate', (message) => {
	if (message.author.bot) return;

	if (message.content === 'ping') {
		message.reply('pong');
	}
});

client.login(process.env.DISCORD_TOKEN);
