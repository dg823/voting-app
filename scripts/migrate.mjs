// db/schema.sql을 Neon에 적용합니다. 여러 번 실행해도 안전합니다.
// 사용법: node scripts/migrate.mjs   (.env.local의 DATABASE_URL 사용)
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const env = readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.*)$/m);
if (!env) throw new Error(".env.local에 DATABASE_URL이 없습니다.");
const sql = neon(env[1].trim());

// 세미콜론으로 문장을 나누되, $$ ... $$ 블록 안의 세미콜론은 무시한다.
const statements = [];
let current = "";
let inDollarBlock = false;
for (const line of readFileSync("db/schema.sql", "utf8").split(/\r?\n/)) {
  if (!current && /^\s*(--.*)?$/.test(line)) continue;
  current += line + "\n";
  if ((line.match(/\$\$/g) ?? []).length % 2 === 1) inDollarBlock = !inDollarBlock;
  if (!inDollarBlock && /;\s*$/.test(line)) {
    statements.push(current.trim());
    current = "";
  }
}

for (const statement of statements) await sql.query(statement);
console.log(`${statements.length}개 문장을 적용했습니다.`);
