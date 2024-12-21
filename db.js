const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const connectDB = async () => {
    if (!client.isConnected()) await client.connect();
    return client.db('logindb');
};

const createUser = async (name, email, password) => {
    const db = await connectDB();
    const result = await db.collection('users').insertOne({ name, email, password });
    return result.ops[0];
};

const getUserByEmail = async (email) => {
    const db = await connectDB();
    const user = await db.collection('users').findOne({ email });
    return user;
};

const getUserById = async (id) => {
    const db = await connectDB();
    const user = await db.collection('users').findOne({ _id: new MongoClient.ObjectID(id) });
    return user;
};

module.exports = {
    createUser,
    getUserByEmail,
    getUserById,
};



// BlrPU7xUlY0WybIC