require('dotenv').config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { createUser, getUserByEmail, getUserById } = require('./db');

// Get the deployment URL from environment variable or use the hardcoded one
const deploymentURL = process.env.DEPLOYMENT_URL || 'https://ai-resume-analyser-dq0k5z4qe-abhishek-ans-projects-83378fc9.vercel.app';
const callbackURL = process.env.NODE_ENV === 'production'
  ? `${deploymentURL}/auth/google/callback`
  : 'http://localhost:8080/auth/google/callback';

console.log('Using callback URL:', callbackURL); // For debugging

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callbackURL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google auth callback received:', { email: profile.emails[0].value }); // For debugging
      let user = await getUserByEmail(profile.emails[0].value);
      if (!user) {
        user = await createUser(profile.displayName, profile.emails[0].value, '');
      }
      return done(null, user);
    } catch (error) {
      console.error('Error in Google auth callback:', error); // For debugging
      return done(error, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user._id.toString());
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