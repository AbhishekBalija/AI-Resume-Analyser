require('dotenv').config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { getUserById, createUser } = require('./db');

const CALLBACK_URL = process.env.NODE_ENV === 'production'
    ? 'https://ai-resume-analyser-dq0k5z4qe-abhishek-ans-projects-83378fc9.vercel.app/auth/google/callback'
    : 'http://localhost:8080/auth/google/callback';

console.log('Auth Configuration:', {
    clientID: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not Set',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not Set',
    callbackURL: CALLBACK_URL,
    environment: process.env.NODE_ENV
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
    passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        console.log('Google OAuth callback received for:', profile.emails[0].value);
        
        // Check if user exists
        const existingUser = await getUserById(profile.id);
        if (existingUser) {
            console.log('Existing user found:', profile.emails[0].value);
            return done(null, existingUser);
        }

        // Create new user
        const newUser = await createUser({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            createdAt: new Date()
        });

        console.log('New user created:', profile.emails[0].value);
        done(null, newUser);
    } catch (error) {
        console.error('Error in Google Strategy:', error);
        done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await getUserById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;