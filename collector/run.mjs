// The daily collector. Gathers fixtures from every source and saves them to the database.
// Run by .github/workflows/collect.yml each morning. To try it without saving: DRY=1 node collector/run.mjs
import { appendFileSync } from 'node:fs';
import { runImport } from '../supabase/functions/import-ticketmaster/index.ts';

const dry = process.env.DRY === '1' || process.env.DRY === 'true';
const needed = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TICKETMASTER_KEY'].filter((k) => !process.env[k]);
if (needed.length) {
  console.error(`Missing settings: ${needed.join(', ')}. Add them as repository secrets.`);
  process.exit(1);
}

const sources = [{ name: 'Ticketmaster and Universe', run: () => runImport(process.env.TICKETMASTER_KEY, dry) }];

const lines = [`# Fixture collection${dry ? ' (dry run, nothing saved)' : ''}`, ''];
let failed = false;
for (const source of sources) {
  try {
    const r = await source.run();
    const sports = Object.entries(r.bySport).map(([k, n]) => `${k} ${n}`).join(', ');
    lines.push(`## ${source.name}`, '', `- Found: ${r.importable}`, `- Saved: ${r.saved}`, `- Removed as no longer listed: ${r.removedAsNoLongerListed}`, `- By sport: ${sports || 'none'}`);
    if (r.errors.length) {
      failed = true;
      lines.push('- Problems:', ...r.errors.map((e) => `  - ${e}`));
    }
    lines.push('');
  } catch (e) {
    failed = true;
    lines.push(`## ${source.name}`, '', `- Failed: ${e.message}`, '');
  }
}

const report = lines.join('\n');
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + '\n');
process.exit(failed ? 1 : 0);
