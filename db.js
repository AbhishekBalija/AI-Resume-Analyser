const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const connectDB = async () => {
    try {
        await client.connect();
        return client.db('logindb');
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        throw error;
    }
};

const createUser = async (name, email, password) => {
    const db = await connectDB();
    const result = await db.collection('users').insertOne({ name, email, password });
    return { _id: result.insertedId, name, email, password };
};

const getUserByEmail = async (email) => {
    const db = await connectDB();
    const user = await db.collection('users').findOne({ email });
    return user;
};

const getUserById = async (id) => {
    const db = await connectDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    return user;
};

module.exports = {
    createUser,
    getUserByEmail,
    getUserById,
};

// BlrPU7xUlY0WybIC