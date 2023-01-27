import type { Record as AirtableRecord, Records, Table } from 'airtable';
export function getAllRecords(table: Table<Record<string, string>>): Promise<Array<AirtableRecord<Record<any, any>>>> {
	return new Promise((res, rej) => {
		const total: Records<Record<string, string>>[] = [];
		table.select().eachPage(
			(records, fetchNextPage) => {
				// This function (`page`) will get called for each page of records.

				total.push(records);

				// To fetch the next page of records, call `fetchNextPage`.
				// If there are more records, `page` will get called again.
				// If there are no more records, `done` will get called.
				fetchNextPage();
			},
			(err) => {
				if (err) rej(err);
				return res(total.flat(1));
			}
		);
	});
}
