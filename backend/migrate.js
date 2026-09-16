/*
 * Runs every .sql file in ./migrations against the database configured
 * in your .env (DATABASE_URL), in filename order.
 *
 * Usage:   cd backend && node migrate.js
 */

const fs = require('fs');
const path = require('path');
const db = require('./db');

async function run() {
  const dir = path.join(__dirname, 'migrations');

  if (!fs.existsSync(dir)) {
    console.error('  No migrations folder found at', dir);
    process.exit(1);
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  if (!files.length) {
    console.error('  No .sql files found in', dir);
    process.exit(1);
  }

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    process.stdout.write(`  running ${file} ... `);
    try {
      await db.query(sql);
      console.log('done');
    } catch (err) {
      console.log('FAILED');
      console.error(`\n  ${err.message}\n`);
      process.exit(1);
    }
  }

  // Confirm the view exists and report what it sees.
  try {
    const check = await db.query(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status_live = 'RED')::int    AS red,
             COUNT(*) FILTER (WHERE status_live = 'ORANGE')::int AS orange,
             COUNT(*) FILTER (WHERE status_live = 'YELLOW')::int AS yellow,
             COUNT(*) FILTER (WHERE status_live = 'GREEN')::int  AS green
      FROM v_assets_live
    `);
    const r = check.rows[0];
    console.log(`\n  View v_assets_live is live.`);
    console.log(`  ${r.total} asset(s): ${r.red} expired, ${r.orange} under 6 months, ` +
                `${r.yellow} under 12 months, ${r.green} supported.`);
    if (r.total === 0) {
      console.log('  (Empty is fine — run "node seedData.js" to load demo data.)');
    }
  } catch (err) {
    console.error('\n  Migration ran but the view could not be queried:', err.message);
    process.exit(1);
  }

  console.log('');
  process.exit(0);
}

run();
