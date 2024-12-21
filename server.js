require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const passport = require('./auth');
const { createUser, getUserByEmail } = require('./db');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

app.use(bodyParser.json());

// Session configuration
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
};

if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); // trust first proxy
    sessionConfig.cookie.secure = true; // serve secure cookies
}

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// Set CSP headers
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'self'; font-src 'self' https://cdnjs.cloudflare.com https://fonts.googleapis.com https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' data:; connect-src 'self' https://generativelanguage.googleapis.com; worker-src 'self' blob:;");
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve RegisterPage.html at the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'RegisterPage.html'));
});

// Serve Privacy Policy and Terms of Service pages
app.get('/privacy.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/terms.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

// Endpoint to get API key
app.get('/api/key', (req, res) => {
    res.json({ apiKey: process.env.GEMINI_API_KEY });
});

app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        // Check if user already exists
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await createUser(name, email, hashedPassword);
        
        // Log the user in after registration
        req.login(user, (err) => {
            if (err) {
                console.error('Login error:', err);
                return res.status(500).json({ error: 'Error logging in after registration' });
            }
            res.status(201).json({ success: true, redirectUrl: '/HomePage.html' });
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await getUserByEmail(email);
        if (user && await bcrypt.compare(password, user.password)) {
            req.login(user, (err) => {
                if (err) {
                    console.error('Login error:', err);
                    return res.status(500).json({ error: 'Error during login' });
                }
                res.status(200).json({ success: true, redirectUrl: '/HomePage.html' });
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Google OAuth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, redirect to home page.
    res.redirect('/HomePage.html');
  }
);

// Add authentication middleware
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
};

// Protect HomePage.html
app.get('/HomePage.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'HomePage.html'));
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});