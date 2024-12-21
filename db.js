const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI is not set in environment variables');
    process.exit(1);
}

console.log('MongoDB Environment:', {
    isProduction: process.env.NODE_ENV === 'production',
    hasUri: !!uri,
    uriPrefix: uri.split('@')[0].substring(0, 20) + '...' // Log part of URI safely
});

const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 10000, // 10 seconds
    serverSelectionTimeoutMS: 10000, // 10 seconds
    socketTimeoutMS: 45000, // 45 seconds
};

let client = null;
let dbConnection = null;

const connectDB = async () => {
    try {
        if (!client) {
            console.log('Initiating new MongoDB connection...');
            client = new MongoClient(uri, options);
        }

        if (!dbConnection) {
            console.log('Connecting to MongoDB...');
            await client.connect();
            dbConnection = client.db('logindb');
            console.log('Successfully connected to MongoDB.');

            // Add connection error handler
            client.on('error', (error) => {
                console.error('MongoDB connection error:', error);
                dbConnection = null;
                client = null;
            });

            // Add connection close handler
            client.on('close', () => {
                console.log('MongoDB connection closed');
                dbConnection = null;
                client = null;
            });
        }

        // Test the connection
        await dbConnection.command({ ping: 1 });
        return dbConnection;
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        dbConnection = null;
        client = null;
        throw error;
    }
};

const createUser = async (name, email, password) => {
    try {
        console.log('Attempting to create user:', email);
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
            createdAt: new Date()
        };
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};

const getUserByEmail = async (email) => {
    try {
        console.log('Looking up user by email:', email);
        const db = await connectDB();
        const user = await db.collection('users').findOne({ email });
        console.log('User lookup result:', email, user ? 'found' : 'not found');
        return user;
    } catch (error) {
        console.error('Error getting user by email:', error);
        throw error;
    }
};

const getUserById = async (id) => {
    try {
        console.log('Looking up user by ID:', id);
        const db = await connectDB();
        const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
        console.log('User lookup result:', id, user ? 'found' : 'not found');
        return user;
    } catch (error) {
        console.error('Error getting user by ID:', error);
        throw error;
    }
};

// Cleanup function
const closeConnection = async () => {
    if (client) {
        try {
            await client.close();
            dbConnection = null;
            client = null;
            console.log('MongoDB connection closed.');
        } catch (error) {
            console.error('Error closing MongoDB connection:', error);
            throw error;
        }
    }
};

// Handle process termination
process.on('SIGINT', async () => {
    await closeConnection();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeConnection();
    process.exit(0);
});

module.exports = {
    connectDB,
    createUser,
    getUserByEmail,
    getUserById,
    closeConnection
};