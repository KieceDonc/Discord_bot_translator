require('dotenv').config(); //to start process from .env file
const { Flags } = require('./flags.js');
const { Client, Events, GatewayIntentBits, Partials } = require('discord.js');
const { Translate } = require('@google-cloud/translate').v2;
const translate = new Translate({
	projectId: 'rational-text-366816',
	keyFilename: './google_api.json',
});

let kieceUser = null;

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.MessageContent,
	],
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.on(Events.ClientReady, () => {
	console.log(`Logged in as ${client.user.tag}!`);
	client.users.fetch('302529594685128707', false).then((user) => {
		kieceUser = user;
	});
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
	// When a reaction is received, check if the structure is partial
	if (reaction.partial) {
		// If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
		try {
			await reaction.fetch();
		} catch (error) {
			console.error('Something went wrong when fetching the message:', error);
			// Return as `reaction.message.author` may be undefined/null
			return;
		}
	}

	let flagEmoji = reaction.emoji.name;
	let messageText = reaction.message.content;
	let flagObject = Flags.getFlagObject(flagEmoji);
	let flagCode = flagObject.code;

	try {
		if (flagCode != null) {
			// flag code has been founded
			let finalTranslation = await getTranslation(messageText, flagCode);
			let embedMessage = getEmbed(
				finalTranslation,
				user.username,
				user.displayAvatarURL(),
				flagCode
			);
			reaction.message.reply({ embeds: [embedMessage] });
		}
	} catch (e) {
		let error = 'Error with flag code : ' + flagCode + ', ' + e;
		console.log(error);
		kieceUser.send(error);

		let embedMessageError = getEmbedError(
			user.username,
			user.displayAvatarURL(),
			flagCode
		);
		reaction.message.reply({ embeds: [embedMessageError] });
	}
});

client.login(process.env.TOKEN);

async function getTranslation(messageText, flagCode) {
	let [translations] = await translate.translate(messageText, flagCode);
	translations = Array.isArray(translations) ? translations : [translations];
	let finalTranslation = '';
	translations.forEach((translation, i) => {
		// console.log(`${messageText[i]} => (${flagCode}) ${translation}`);
		finalTranslation += translation;
	});
	return finalTranslation;
}

function getEmbed(
	translationText,
	authorName,
	authorIconURL,
	translationOrigin
) {
	return {
		color: 14687012,
		description: translationText,
		timestamp: '',
		author: {
			name: authorName,
			icon_url: authorIconURL,
		},
		image: {},
		thumbnail: {},
		footer: {
			text: 'From ' + translationOrigin,
		},
		fields: [],
	};
}

function getEmbedError(authorName, authorIconURL, translationOrigin) {
	return {
		color: 14687012,
		description:
			"Your flag isn't added to the bot yet, wait for <@302529594685128707> to add it",
		timestamp: '',
		author: {
			name: authorName,
			icon_url: authorIconURL,
		},
		image: {},
		thumbnail: {},
		footer: {
			text: 'Language : EN',
		},
		fields: [],
	};
}
