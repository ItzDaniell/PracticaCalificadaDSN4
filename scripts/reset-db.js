#!/usr/bin/env node

/**
 * Script para limpiar y resetear la base de datos
 * Uso: node scripts/reset-db.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'auth_db'
  });

  try {
    console.log('🔄 Iniciando limpieza de base de datos...\n');

    // Vaciar tabla de usuarios
    await connection.execute('TRUNCATE TABLE users');
    console.log('✓ Tabla de usuarios limpiada');

    // Mostrar estado actual
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`✓ Total de usuarios: ${users[0].count}\n`);

    console.log('✅ Base de datos reseteada correctamente!');
    console.log('Ahora puedes registrarte con nuevas credenciales.\n');

  } catch (error) {
    console.error('❌ Error al resetear base de datos:', error.message);
  } finally {
    await connection.end();
  }
}

resetDatabase();
