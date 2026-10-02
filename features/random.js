export async function handleRandomMessage(message, stations) {
	if (!message.content.startsWith('!random')) return false;

	const filters = message.content.split(' ').slice(1);
	const candidates =
		filters.length === 0 ? stations : stations.filter((station) => filters.includes(station.prefecture) || filters.includes(station.city));
	const random = Math.floor(Math.random() * candidates.length);
	await message.reply(candidates[random].name);
	return true;
}
