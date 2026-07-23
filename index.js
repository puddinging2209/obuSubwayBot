import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

import stationList from './stationList.json' with { type: 'json' };
const prefectureList = Array.from(new Set(stationList.map((station) => station.prefecture)));
const citiesList = Array.from(new Set(stationList.map((station) => station.city)));

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

	if (message.content.match(/(random).*/)) {
		const filter = message.content.split(' ')[1];
		switch (true) {
			case !filter: {
				const random = Math.floor(Math.random() * stationList.length);
				message.reply(stationList[random].name);
				break;
			}
			case prefectureList.includes(filter): {
				const random = Math.floor(Math.random() * stationList.filter((station) => station.prefecture === filter).length);
				message.reply(stationList.filter((station) => station.prefecture === filter)[random].name);
				break;
			}
			case citiesList.includes(filter): {
				const random = Math.floor(Math.random() * stationList.filter((station) => station.city === filter).length);
				message.reply(stationList.filter((station) => station.city === filter)[random].name);
				break;
			}
		}
	}
});

client.login(process.env.DISCORD_TOKEN);

// ダミー
import http from 'http';
http.createServer((req, res) => {
	res.write('Bot is alive!');
	res.end();
}).listen(process.env.PORT || 10000);
