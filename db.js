const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI is not set in environment variables');
    process.exit(1);
}

const client = new MongoClient(uri);
let dbConnection = null;

const connectDB = async () => {
    try {
        if (!dbConnection) {
            await client.connect();
            dbConnection = client.db('logindb');
            console.log('Successfully connected to MongoDB.');
        }
        return dbConnection;
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        throw error;
    }
};

const createUser = async (name, email, password) => {
    try {
        const db = await connectDB();
        const result = await db.collection('users').insertOne({ 
            name, 
            email, 
            password,
            createdAt: new Date()
        });
        console.log('User created successfully:', email);
        return { 
            _id: result.insertedId, 
            name, 
            email, 
            password,
            createdAt: new Date()
        };
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};

const getUserByEmail = async (email) => {
    try {
        const db = await connectDB();
        const user = await db.collection('users').findOne({ email });
        console.log('User lookup by email:', email, user ? 'found' : 'not found');
        return user;
    } catch (error) {
        console.error('Error getting user by email:', error);
        throw error;
    }
};

const getUserById = async (id) => {
    try {
        const db = await connectDB();
        const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
        console.log('User lookup by ID:', id, user ? 'found' : 'not found');
        return user;
    } catch (error) {
        console.error('Error getting user by ID:', error);
        throw error;
    }
};

// Cleanup function
const closeConnection = async () => {
    try {
        await client.close();
        dbConnection = null;
        console.log('MongoDB connection closed.');
    } catch (error) {
        console.error('Error closing MongoDB connection:', error);
        throw error;
    }
};

process.on('SIGINT', async () => {
    await closeConnection();
    process.exit(0);
});

module.exports = {
    createUser,
    getUserByEmail,
    getUserById,
    closeConnection
};

// BlrPU7xUlY0WybIC