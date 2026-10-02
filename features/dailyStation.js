import { ChannelType, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import cron from 'node-cron';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const timeTableUrl = 'https://puddinging2209.github.io/Obu-City-Transportation-Bureau-HomePage/#/timetable';

const settingsPath = fileURLToPath(new URL('../data/dailyStationSettings.json', import.meta.url));
const settings = new Map();
const tokyoDateFormatter = new Intl.DateTimeFormat('en-US', {
	timeZone: 'Asia/Tokyo',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
});

export const dailyStationCommand = new SlashCommandBuilder()
	.setName('daily-station')
	.setDescription('今日の送信先を設定します')
	.addSubcommand((subcommand) =>
		subcommand
			.setName('set')
			.setDescription('今日の駅を送信するチャンネルを設定します')
			.addChannelOption((option) =>
				option
					.setName('channel')
					.setDescription('送信先チャンネル')
					.addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
					.setRequired(true),
			),
	)
	.addSubcommand((subcommand) => subcommand.setName('disable').setDescription('今日の駅の送信を停止します'))
	.toJSON();

function getTokyoDateKey(date) {
	const parts = Object.fromEntries(tokyoDateFormatter.formatToParts(date).map(({ type, value }) => [type, value]));
	return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getDailyStation(stations, date = new Date()) {
	const dateKey = getTokyoDateKey(date);
	const hash = createHash('sha256').update(dateKey).digest();
	return stations[hash.readUInt32BE(0) % stations.length];
}

export function getTodaySendTime(date = new Date()) {
	const [year, month, day] = getTokyoDateKey(date).split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day, 7) - 9 * 60 * 60 * 1000);
}

async function saveSettings() {
	await writeFile(settingsPath, `${JSON.stringify(Object.fromEntries(settings), null, '\t')}\n`);
}

async function sendDailyStation(client, stations, lineList, date = new Date(), onlyGuildId) {
	const dateKey = getTokyoDateKey(date);
	const station = getDailyStation(stations, date);

	for (const [guildId, setting] of settings) {
		if (onlyGuildId && guildId !== onlyGuildId) continue;
		if (setting.lastSentDate === dateKey) continue;

		try {
			const channel = await client.channels.fetch(setting.channelId);
			if (!channel?.isTextBased() || typeof channel.send !== 'function') continue;

			const messageBody = `今日の駅（${dateKey})： ${station.name}(${station.id}) - ${station.prefecture} ${station.city}\n${station.lines.map((id) => lineList.find((line) => line.id === id).name).join(' ')}\n時刻表: ${timeTableUrl}?station=${station.id}`;
			const color = lineList.find((line) => line.id === station.lines[Math.floor(Math.random() * station.lines.length)])?.color || 0xffffff;
			const embed = new EmbedBuilder().setColor(color).setDescription(messageBody);
			await channel.send({ embeds: [embed] });
			setting.lastSentDate = dateKey;
			await saveSettings();
		} catch (error) {
			console.error(`Failed to send the daily station to guild ${guildId}:`, error);
		}
	}
}

export async function startDailyStation(client, stations, lineList) {
	try {
		const savedSettings = await readFile(settingsPath, 'utf8');
		for (const [guildId, setting] of Object.entries(JSON.parse(savedSettings))) {
			settings.set(guildId, setting);
		}
	} catch (error) {
		if (error.code !== 'ENOENT') throw error;
	}

	await client.application.commands.set([dailyStationCommand]);
	const now = new Date();
	if (now >= getTodaySendTime(now)) await sendDailyStation(client, stations, lineList, now);
	cron.schedule('0 7 * * *', () => sendDailyStation(client, stations, lineList), {
		timezone: 'Asia/Tokyo',
		noOverlap: true,
	});
}

export async function handleDailyStationInteraction(interaction, client, stations, lineList) {
	if (!interaction.isChatInputCommand() || interaction.commandName !== 'daily-station') return false;
	if (!interaction.guildId) {
		await interaction.reply({ content: 'サーバー内で実行してください。', ephemeral: true });
		return true;
	}

	if (interaction.options.getSubcommand() === 'set') {
		const channel = interaction.options.getChannel('channel', true);
		settings.set(interaction.guildId, { channelId: channel.id, lastSentDate: null });
		await saveSettings();
		await interaction.reply({ content: `今日の駅を ${channel} に送信します。` });

		const now = new Date();
		if (now >= getTodaySendTime(now)) {
			await sendDailyStation(client, stations, lineList, now, interaction.guildId);
		}
		return true;
	}

	settings.delete(interaction.guildId);
	await saveSettings();
	await interaction.reply({ content: '今日の駅の送信を停止しました。' });
	return true;
}
