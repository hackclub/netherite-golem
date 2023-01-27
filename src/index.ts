// gonna need to ESMify this - TODO @cfanoulis

import * as dotenv from 'dotenv';
dotenv.config();

import { App, LogLevel } from '@slack/bolt';
import * as Airtable from 'airtable';
import { getAllRecords } from './utils/airtable.js';

const app = new App({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET,
	appToken: process.env.SLACK_SOCKET_TOKEN,
	socketMode: true,
	logLevel: LogLevel.DEBUG
});

Airtable.configure({
	apiKey: process.env.AIRTABLE_KEY
});
const hackNightBase = Airtable.base('appD7LebR9JUA36H2');
const timeRegex = /(?<hour>\d{2}):(?<min>\d{2})/;

// Listens to incoming messages that contain "hello"
app.message('when are hack nights?', async ({ message, say }) => {
	const scheduleData = (await getAllRecords(hackNightBase.table('Schedule'))).map((e) => {
		const timeRes = timeRegex.exec(e.fields['Time Start']);
		if (!timeRes) throw `Couldn't parse time!`;
		const startTime = new Date(2023, 1, 1, parseInt(timeRes.groups!.hour) ?? 2, parseInt(timeRes.groups!.min) ?? 2).getTime();

		return {
			title: e.fields['Title'],
			days: e.fields['Day'] as unknown as string[],
			startTimestamp: startTime / 1000,
			startTimeText: e.fields['Time Start']
		};
	});
	const schedule = scheduleData.map(
		(e) => `* *${e.title}*, every ${e.days.join(' and ')} at <!date^${e.startTimestamp}^{time}|${e.startTimeText} UTC>`
	);
	await say({
		blocks: [
			{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: `
Hey! Right now, Hack Nights run as follows:
${schedule.join('\n')}

Do none of these timeslots sue you? Grab a friend (or three) and suggest a new time in #hack-night!`
				}
			}
		]
	});
});

(async () => {
	// Start your app
	await app.start(Number(process.env.PORT) || 3000);

	console.log('⚡️ Bolt app is running!');
})();
