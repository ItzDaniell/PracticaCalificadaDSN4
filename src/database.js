const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root123',
  database: process.env.DB_NAME || 'auth_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Crear tablas si no existen
async function initializeDatabase() {
  const connection = await pool.getConnection();
  try {
    // Tabla de usuarios
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        two_fa_secret VARCHAR(255),
        two_fa_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('✓ Tablas de base de datos creadas correctamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
  } finally {
    connection.release();
  }
}

module.exports = { pool, initializeDatabase };
