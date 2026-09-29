const FORMAT = 'daybook.jobs';
const STATUSES = new Set(['applied', 'screening', 'interview', 'offer', 'closed']);
export const MAX_BACKUP_BYTES = 2 * 1024 * 1024;
/** Validate the entire payload before a single storage mutation is scheduled. */
export function parseJobBackup(text) {
    if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_BACKUP_BYTES)
        throw new Error('Choose a JSON backup no larger than 2 MB.');
    let backup;
    try {
        backup = JSON.parse(text);
    }
    catch {
        throw new Error('The file is not valid JSON.');
    }
    if (!backup || backup.format !== FORMAT || backup.version !== 1 || !Array.isArray(backup.applications))
        throw new Error('Expected a Daybook applications backup, version 1.');
    if (backup.applications.length > 10000)
        throw new Error('A backup may contain at most 10,000 applications.');
    const ids = new Set();
    return backup.applications.map((record, index) => {
        const fail = (reason) => { throw new Error(`Application ${index + 1}: ${reason}`); };
        if (!record || typeof record !== 'object' || Array.isArray(record))
            fail('expected an object.');
        const value = {};
        for (const field of ['id', 'company', 'role', 'location', 'url', 'status', 'stack', 'date', 'notes']) {
            const item = record[field] ?? '';
            if (typeof item !== 'string' || item.length > (field === 'notes' ? 100000 : 5000))
                fail(`${field} must be bounded text.`);
            value[field] = item;
        }
        if (!value.id.trim() || ids.has(value.id))
            fail('id is missing or duplicated.');
        ids.add(value.id);
        if (!value.company.trim())
            fail('company is required.');
        if (!STATUSES.has(value.status))
            fail('unknown status.');
        if (value.date) {
            const date = new Date(`${value.date}T00:00:00Z`);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value.date)
                fail('date must be a real YYYY-MM-DD date or empty.');
        }
        if (value.url) {
            try {
                if (!['http:', 'https:'].includes(new URL(value.url).protocol))
                    fail('URL must use http or https.');
            }
            catch {
                fail('URL must be an absolute http or https URL.');
            }
        }
        return value;
    });
}
export function exportJobBackup(applications) {
    const text = JSON.stringify({ format: FORMAT, version: 1, applications }, null, 2);
    parseJobBackup(text); // Never generate a backup the importer cannot restore.
    return text;
}
export async function commitJobBackup(storage, text) {
    const applications = parseJobBackup(text);
    await storage.set('jobtracker:data', JSON.stringify(applications));
    return applications;
}
