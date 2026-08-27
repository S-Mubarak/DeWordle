#!/usr/bin/env node
// scripts/seed-dev-db.js
// Seeds local development database with test sessions

const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dewordle_dev'
});

const WORDS = ['crane', 'slate', 'arise', 'train', 'store', 'light'];

async function seed() {
  await client.connect();
  console.log('Connected to database');

  // Insert test users
  await client.query(
    INSERT INTO users (id, email, username, created_at)
    VALUES
      ('test-user-1', 'test1@example.com', 'testplayer1', NOW()),
      ('test-user-2', 'test2@example.com', 'testplayer2', NOW())
    ON CONFLICT (id) DO NOTHING
  );

  // Insert test sessions
  for (let i = 0; i < WORDS.length; i++) {
    await client.query(
      INSERT INTO game_sessions (user_id, word, completed, created_at)
      VALUES ('test-user-1', , true, NOW())
      ON CONFLICT DO NOTHING
    , [WORDS[i]]);
  }

  console.log('Seeded', WORDS.length, 'test sessions');
  await client.end();
}

seed().catch(err => { console.error(err); process.exit(1); });