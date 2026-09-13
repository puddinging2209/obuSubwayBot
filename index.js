import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

import stationList from './stationList.json' with { type: 'json' };

const activeQuizzes = new Map();

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
	if (message.content.match(/(!random).*/)) {
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
	if (message.content === '!quiz') {
		const random = Math.floor(Math.random() * stationList.length);
		const question = stationList[random].id;
		const answer = stationList[random].name;

		const sentMessage = await message.channel.send(`question: ${question}`);

		activeQuizzes.set(message.channel.id, {
			questionMessageId: sentMessage.id,
			answer: answer,
		});
		return;
	}

	const currentQuiz = activeQuizzes.get(message.channel.id);

	if (currentQuiz && message.reference) {
		if (message.reference.messageId === currentQuiz.questionMessageId) {
			if (message.content.trim() === currentQuiz.answer) {
				await message.reply('ok');
				activeQuizzes.delete(message.channel.id);
			} else {
				await message.reply('no');
			}
		}
	}

	if (message.content === '!escapeQuiz') {
		message.reply(`answer: ${currentQuiz.answer}`);
		activeQuizzes.delete(message.channel.id);
	}
});

// ダミー
import http from 'http';
http.createServer((req, res) => {
	res.write('Bot is alive!');
	res.end();
}).listen(process.env.PORT || 10000);

client.login(process.env.DISCORD_TOKEN);
