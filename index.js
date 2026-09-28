import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

import stationList from './stationList.json' with { type: 'json' };

// botのクライアントを作成
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// 起動時の処理
client.on('clientReady', () => {
	console.log(`Logged in as ${client.user.tag}!`);
});

// メッセージを受け取ったとき
client.on('messageCreate', async (message) => {
	if (message.author.bot) return;

	// ランダム
	if (message.content.startsWith('!random')) {
		const filters = message.content.split(' ').slice(1);
		if (filters.length === 0) {
			const random = Math.floor(Math.random() * stationList.length);
			message.reply(stationList[random].name);
			return;
		}

		const filtered = stationList.filter((station) => {
			return filters.includes(station.prefecture) || filters.includes(station.city);
		});
		const random = Math.floor(Math.random() * filtered.length);
		message.reply(filtered[random].name);
		return;
	}

	// クイズ
	if (message.content.startsWith('!quiz')) {
		const filters = message.content.split(' ').slice(1);
		if (filters.length === 0) {
			const random = Math.floor(Math.random() * stationList.length);
			message.reply('question: ' + stationList[random].id);
			return;
		}

		const filtered = stationList.filter((station) => {
			return filters.includes(station.prefecture) || filters.includes(station.city);
		});
		const random = Math.floor(Math.random() * filtered.length);
		message.reply('question: ' + filtered[random].id);
		return;
	}

	if (message.reference) {
		let questionMessage;
		try {
			questionMessage = await message.fetchReference();
		} catch {
			return;
		}

		if (!questionMessage.author.bot) return;

		const questionMatch = questionMessage.content.match(/^question:\s*(\S+)\s*$/);
		const quizStation = questionMatch ? stationList.find((station) => station.id === questionMatch[1]) : undefined;
		if (!quizStation) return;

		if (message.content === '!showAns') {
			await message.reply(`answer: ${quizStation.name}`);
			return;
		}

		if (message.content.trim() === quizStation.name) {
			await message.reply('ok');
		} else {
			await message.reply('no');
		}
	}
});

// ダミー
import http from 'http';
http.createServer((req, res) => {
	res.write('Bot is alive!');
	res.end();
}).listen(process.env.PORT || 10000);

client.login(process.env.DISCORD_TOKEN);
