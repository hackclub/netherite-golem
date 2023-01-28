// gonna need to ESMify this - TODO @cfanoulis

import * as dotenv from 'dotenv';
dotenv.config();

import { App, LogLevel } from '@slack/bolt';
import * as Airtable from 'airtable';
import { getAllRecords } from './utils/airtable.js';
import { dow } from './utils/time.js';

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

// schedule handler
app.message('when are hack nights', async ({ say }) => {
	const scheduleData = (await getAllRecords(hackNightBase.table('Schedule'))).map((e) => {
		const timeRes = timeRegex.exec(e.fields['Time Start']);
		if (!timeRes) throw new Error(`Couldn't parse time!`);
		const startTime = new Date(2023, 1, 1, parseInt(timeRes.groups!.hour, 10) ?? 2, parseInt(timeRes.groups!.min, 10) ?? 2).getTime();

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

// explanation handler
app.message('what are hack nights', async ({ say }) => {
	await say({
		blocks: [
			{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: `
{insert copy to be made}
*How do I join?*
Check the schedule (ask me \`when are hack nights?\`) and be on the lookout for a message in #hack-night when the call is about to start! If you want to participate in unscheduled Hack Nights, you can also join the Hack Night Regulars group :)`
				}
			}
		]
	});
});

// next hack night handler
app.message('next hack night', async ({ say }) => {
	const rightNow = new Date();
	const scheduleData = (await getAllRecords(hackNightBase.table('Schedule'))).map((e) => {
		const timeRes = timeRegex.exec(e.fields['Time Start']);
		if (!timeRes) throw new Error(`Couldn't parse time!`);
		const startTime = new Date(2023, 1, 1, parseInt(timeRes.groups!.hour, 10) ?? 2, parseInt(timeRes.groups!.min, 10) ?? 2).getTime();

		return {
			title: e.fields['Title'] as string,
			days: e.fields['Day'].map((input: string) => dow.findIndex((e) => e === input)) as number[],
			startTime: startTime as number
		};
	});

	// check if there's a hack night _today_
	const todayHn = scheduleData.filter((e) => e.days.includes(rightNow.getDay()));
	if (todayHn.length > 1) {
		// time is calculated as an offset from 2023/01/01 00:00 UTC so we can filter & sort by timestamps
		// TODO: How do we determine duration of hack nights? are they 6/7/8 hours?
		const next = todayHn.filter((e) => e.startTime > rightNow.getTime()).sort((a, b) => a.startTime - b.startTime)[0];
		await say(`Next Hack Night: ${next.title} at ${next.startTime}`);
	} else {
		// TODO: Make this one
	}
});

void (async () => {
	// Start your app
	await app.start(Number(process.env.PORT) || 3000);

	console.log('⚡️ Bolt app is running!');
})();
