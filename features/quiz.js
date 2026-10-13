function getHintType(content) {
	if (/^hint: 所在地は.*です$/.test(content)) return 0;
	if (/^hint: 通る路線の1つは.*です$/.test(content)) return 1;
	if (/^hint: 駅名は\d+文字です$/.test(content)) return 2;
	if (/^hint: 駅名の最初の文字は「.*」です$/.test(content)) return 3;
	return undefined;
}

async function getUsedHintTypes(message, questionMessage) {
	const usedHintTypes = new Set();
	let before = message.id;

	while (true) {
		const previousMessages = await message.channel.messages.fetch({ before, limit: 100 });
		if (previousMessages.size === 0) break;

		for (const previousMessage of previousMessages.values()) {
			if (previousMessage.author.bot && previousMessage.reference?.messageId === questionMessage.id) {
				const hintType = getHintType(previousMessage.content);
				if (hintType !== undefined) usedHintTypes.add(hintType);
			}
		}

		const oldestMessage = previousMessages.last();
		if (!oldestMessage || BigInt(oldestMessage.id) <= BigInt(questionMessage.id)) break;
		before = oldestMessage.id;
	}

	return usedHintTypes;
}

export async function handleQuizMessage(message, stations, lineList) {
	if (message.content.startsWith('!quiz')) {
		const filters = message.content.split(' ').slice(1);
		const candidates =
			filters.length === 0 ? stations : stations.filter((station) => filters.includes(station.prefecture) || filters.includes(station.city));
		const random = Math.floor(Math.random() * candidates.length);
		await message.reply(`## question: **${candidates[random].id}**`);
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

	const questionMatch = questionMessage.content.match(/(?:^|\n)question:\s*(?:\*\*(\S+)\*\*|(\S+))\s*(?:\n|$)/);
	const questionId = questionMatch?.[1] ?? questionMatch?.[2];
	const quizStation = questionId ? stations.find((station) => station.id === questionId) : undefined;
	if (!quizStation) return false;

	if (message.content === '!hint') {
		const usedHintTypes = await getUsedHintTypes(message, questionMessage);
		const availableHintTypes = [0, 1, 2, 3].filter((hintType) => !usedHintTypes.has(hintType));
		if (availableHintTypes.length === 0) {
			await message.reply('これ以上ヒントはありません');
			return true;
		}

		const hintType = availableHintTypes[Math.floor(Math.random() * availableHintTypes.length)];
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
