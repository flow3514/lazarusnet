#!/usr/bin/env node
/**
 * Local PostgreSQL for development — a real Postgres server (embedded-postgres
 * downloads the official binaries) with its data in ./.data/pg.
 *
 *   node scripts/dev-db.mjs            start on port 5433 (Ctrl+C stops it)
 *   DEV_DB_PORT=5444 node scripts/dev-db.mjs
 *
 * Connection string (put it in .env.local):
 *   DATABASE_URL=postgres://postgres:postgres@localhost:5433/lazarusnet?sslmode=disable
 */
import { existsSync } from 'node:fs'
import EmbeddedPostgres from 'embedded-postgres'

const port = Number(process.env.DEV_DB_PORT || 5433)
const databaseDir = './.data/pg'
const dbName = 'lazarusnet'
const fresh = !existsSync(`${databaseDir}/PG_VERSION`)

const pg = new EmbeddedPostgres({ databaseDir, user: 'postgres', password: 'postgres', port, persistent: true })

if (fresh) {
  console.log('• initialising cluster in', databaseDir)
  await pg.initialise()
}
await pg.start()
const client = pg.getPgClient()
await client.connect()
const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName])
if (exists.rowCount === 0) {
  await client.query(`CREATE DATABASE ${dbName}`)
  console.log('• created database', dbName)
}
await client.end()
console.log(`✓ PostgreSQL ready on localhost:${port}`)
console.log(`  DATABASE_URL=postgres://postgres:postgres@localhost:${port}/${dbName}?sslmode=disable`)

const stop = async () => {
  console.log('\n• stopping PostgreSQL')
  await pg.stop().catch(() => undefined)
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
setInterval(() => undefined, 1 << 30)
