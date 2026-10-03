import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { handleDailyStationInteraction, startDailyStation } from './features/dailyStation.js';
import { startHealthServer } from './features/health.js';
import { handleQuizMessage } from './features/quiz.js';
import { handleRandomMessage } from './features/random.js';
dotenv.config();

import { createLocalGovClient } from '@b4moss/jp-local-gov-id';
import municipalityDataset from '@b4moss/jp-local-gov-id-data';
import lineList from './data/lineList.json' with { type: 'json' };
import stationList from './data/stationList.json' with { type: 'json' };

// botのクライアントを作成
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});
let stations;

// 起動時の処理
client.on('clientReady', async () => {
	console.log(`Logged in as ${client.user.tag}!`);
	try {
		await startDailyStation(client, stations, lineList);
	} catch (error) {
		console.error('Failed to start the daily station feature:', error);
	}
});

client.on('interactionCreate', async (interaction) => {
	try {
		await handleDailyStationInteraction(interaction, client, stations, lineList);
	} catch (error) {
		console.error('Failed to handle the daily station command:', error);
		if (interaction.isChatInputCommand() && !interaction.replied && !interaction.deferred) {
			await interaction.reply({ content: '設定に失敗しました。', ephemeral: true });
		}
	}
});

// メッセージを受け取ったとき
client.on('messageCreate', async (message) => {
	if (message.author.bot) return;

	if (await handleRandomMessage(message, stations)) return;
	await handleQuizMessage(message, stations, lineList);
});

client.on('error', (error) => {
	console.error('Discord client error:', error);
});

client.on('shardError', (error, shardId) => {
	console.error(`Discord gateway shard ${shardId} error:`, error);
});

client.on('shardDisconnect', (event, shardId) => {
	console.error(`Discord gateway shard ${shardId} disconnected:`, event);
});

client.on('shardReconnecting', (shardId) => {
	console.warn(`Discord gateway shard ${shardId} is reconnecting.`);
});

client.on('debug', (message) => {
	if (message.startsWith('[WS =>') || message.includes('Preparing to connect to the gateway')) {
		console.debug('Discord gateway:', message);
	}
});

const healthServer = startHealthServer(process.env.PORT || 10000);

async function startBot() {
	console.log('Starting bot...');
	const token = process.env.DISCORD_TOKEN;
	if (!token) throw new Error('DISCORD_TOKEN environment variable is required.');

	console.log('Initializing municipality data...');
	const localGovClient = await createLocalGovClient({ data: municipalityDataset });
	const municipalityEntries = await Promise.all(
		[...new Set(stationList.map(({ govId }) => govId))].map(async (govId) => {
			const municipality = await localGovClient.getMunicipalityByCode(govId);
			if (!municipality) throw new Error(`Unknown municipality code: ${govId}`);
			return [govId, municipality];
		}),
	);
	const municipalitiesByGovId = new Map(municipalityEntries);
	stations = stationList.map((station) => {
		const municipality = municipalitiesByGovId.get(station.govId);
		return {
			...station,
			city: municipality.name,
			prefecture: municipality.prefectureName,
		};
	});

	console.log(`Initialized ${stations.length} stations. Connecting to Discord...`);
	await client.login(token);
}

startBot().catch((error) => {
	console.error('Bot startup failed:', error);
	client.destroy();
	healthServer.close(() => {
		process.exitCode = 1;
	});
});
