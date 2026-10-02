export async function handleQuizMessage(message, stations, lineList) {
	if (message.content.startsWith('!quiz')) {
		const filters = message.content.split(' ').slice(1);
		const candidates =
			filters.length === 0 ? stations : stations.filter((station) => filters.includes(station.prefecture) || filters.includes(station.city));
		const random = Math.floor(Math.random() * candidates.length);
		await message.reply(`question: ${candidates[random].id}`);
		return true;
	}

	if (!message.reference) return false;

	let questionMessage;
	try {
		questionMessage = await message.fetchReference();
	} catch {
		return false;
	}

	if (!questionMessage.author.bot) return false;

	const questionMatch = questionMessage.content.match(/^question:\s*(\S+)\s*$/);
	const quizStation = questionMatch ? stations.find((station) => station.id === questionMatch[1]) : undefined;
	if (!quizStation) return false;

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
		return true;
	}

	if (message.content === '!ans') {
		await message.reply(`answer: ${quizStation.name}`);
		return true;
	}

	await message.reply(message.content.trim() === quizStation.name ? 'right' : 'doubt');
	return true;
}
