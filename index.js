import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

import { createLocalGovClient } from '@b4moss/jp-local-gov-id';
import municipalityDataset from '@b4moss/jp-local-gov-id-data';
import lineList from './data/lineList.json' with { type: 'json' };
import stationList from './data/stationList.json' with { type: 'json' };

const localGovClient = await createLocalGovClient({ data: municipalityDataset });
const municipalityEntries = await Promise.all(
	[...new Set(stationList.map(({ govId }) => govId))].map(async (govId) => {
		const municipality = await localGovClient.getMunicipalityByCode(govId);
		if (!municipality) throw new Error(`Unknown municipality code: ${govId}`);
		return [govId, municipality];
	}),
);
const municipalitiesByGovId = new Map(municipalityEntries);
const stations = stationList.map((station) => {
	const municipality = municipalitiesByGovId.get(station.govId);
	return {
		...station,
		city: municipality.name,
		prefecture: municipality.prefectureName,
	};
});

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
			const random = Math.floor(Math.random() * stations.length);
			message.reply(stations[random].name);
			return;
		}

		const filtered = stations.filter((station) => {
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
			const random = Math.floor(Math.random() * stations.length);
			message.reply('question: ' + stations[random].id);
			return;
		}

		const filtered = stations.filter((station) => {
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
		const quizStation = questionMatch ? stations.find((station) => station.id === questionMatch[1]) : undefined;
		if (!quizStation) return;

		if (message.content === '!hint') {
			const hintType = Math.floor(Math.random() * 4);
			let hint;
			switch (hintType) {
				case 0:
					hint = `所在地は${quizStation.city}です`;
					break;
				case 1: {
					const lineId = quizStation.lines[Math.floor(Math.random() * quizStation.lines.length)];
					const lineName = lineList.find((line) => line.id === lineId)?.name;
					hint = `通る路線の1つは${lineName}です`;
					break;
				}
				case 2:
					hint = `駅名は${Array.from(quizStation.name).length}文字です`;
					break;
				case 3:
					hint = `駅名の最初の文字は「${Array.from(quizStation.name)[0]}」です`;
					break;
			}
			await message.reply(`hint: ${hint}`);
			return;
		}

		if (message.content === '!ans') {
			await message.reply(`answer: ${quizStation.name}`);
			return;
		}

		if (message.content.trim() === quizStation.name) {
			await message.reply('right');
		} else {
			await message.reply('doubt');
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
