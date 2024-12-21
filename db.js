const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'logindb',
    password: 'root',
    port: 5432,
});

const createUser = async (name, email, password) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
            [name, email, password]
        );
        return result.rows[0];
    } finally {
        client.release();
    }
};

const getUserByEmail = async (email) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0];
    } finally {
        client.release();
    }
};

const getUserById = async (id) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0];
    } finally {
        client.release();
    }
};

module.exports = {
    createUser,
    getUserByEmail,
    getUserById,
};