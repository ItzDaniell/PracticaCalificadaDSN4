#!/usr/bin/env node

/**
 * Script para mostrar todos los usuarios registrados
 * Uso: node scripts/list-users.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function listUsers() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'auth_db'
  });

  try {
    console.log('\n📋 USUARIOS REGISTRADOS\n');

    const [users] = await connection.execute(`
      SELECT 
        id,
        username,
        email,
        two_fa_enabled,
        created_at
      FROM users
      ORDER BY created_at DESC
    `);

    if (users.length === 0) {
      console.log('No hay usuarios registrados aún.\n');
      return;
    }

    console.log(`Total de usuarios: ${users.length}\n`);
    console.table(users);

  } catch (error) {
    console.error('❌ Error al obtener usuarios:', error.message);
  } finally {
    await connection.end();
  }
}

listUsers();
