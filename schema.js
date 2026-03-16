const fs = require('fs');
const { query } = require('./api/db.js');
async function c() {
  const [rows] = await query("SELECT name, sql FROM sqlite_master WHERE type='table'");
  let res = '';
  for (const row of rows) {
    res += row.name + ':\n' + row.sql + '\n\n';
  }
  fs.writeFileSync('schema_utf8.txt', res);
  console.log('ok');
  process.exit();
}
c();
