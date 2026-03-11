const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

function parseSQL(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';
  let inString = false;
  let i = 0;
  
  while (i < sql.length) {
    const remaining = sql.slice(i);
    const dollarMatch = remaining.match(/^\$([a-zA-Z0-9_]*)\$/);
    
    if (dollarMatch && !inString) {
      if (!inDollarQuote) {
        inDollarQuote = true;
        dollarTag = dollarMatch[1];
        i += dollarMatch[0].length;
        current += dollarMatch[0];
        continue;
      } else if (dollarMatch[1] === dollarTag) {
        inDollarQuote = false;
        dollarTag = '';
        i += dollarMatch[0].length;
        current += dollarMatch[0];
        continue;
      }
    }
    
    if (sql[i] === "'" && !inDollarQuote) {
      if (inString && sql[i + 1] === "'") {
        current += sql[i];
        current += sql[i + 1];
        i += 2;
        continue;
      } else if (!inString) {
        inString = true;
      } else {
        inString = false;
      }
    }
    
    if (sql[i] === ';' && !inDollarQuote && !inString) {
      current += ';';
      if (current.trim()) statements.push(current.trim());
      current = '';
    } else {
      current += sql[i];
    }
    i++;
  }
  
  if (current.trim()) statements.push(current.trim());
  return statements;
}

const sql = neon(process.env.DATABASE_URL);
const schema = fs.readFileSync('src/db/migrations/001_initial_schema.sql', 'utf-8');
const statements = parseSQL(schema);

(async () => {
  let count = 0;
  for (let idx = 0; idx < statements.length; idx++) {
    const stmt = statements[idx];
    try {
      await sql.query(stmt);
      count++;
      console.log(`✓ ${idx}: ${stmt.substring(0, 70)}...`);
    } catch (e) {
      console.error(`✗ ${idx}: ${stmt.substring(0, 70)}...`);
      console.error('Error:', e.message);
      // Don't break - continue to see more errors
    }
  }
  console.log('Done - ' + count + ' statements executed out of ' + statements.length + ' total');
})();
