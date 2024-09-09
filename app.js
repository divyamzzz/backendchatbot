require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const dialogflow = require('@google-cloud/dialogflow');
const uuid = require('uuid');
const fs = require('fs');
const session = require('express-session');
const cors = require('cors');  // Import CORS middleware

const app = express();
const port = process.env.PORT || 5000;

// Use CORS middleware to allow requests from all origins (you can also configure specific origins)
app.use(cors()); 

// Use session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'my-secret', // Session secret
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1-day session expiry
}));

// Use body-parser middleware to parse JSON requests
app.use(bodyParser.json());

// Create the service account credentials dynamically from the environment variable
const serviceAccountKey = process.env.GOOGLE_APPLICATION_CREDENTIALS_CONTENTS;

if (serviceAccountKey) {
  const serviceAccountPath = './google-credentials.json';
  fs.writeFileSync(serviceAccountPath, serviceAccountKey);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
  console.log('Service account key has been successfully written to', serviceAccountPath);
} else {
  console.error('GOOGLE_APPLICATION_CREDENTIALS_CONTENTS is not set. Please set the environment variable.');
  process.exit(1); // Exit if credentials are not available
}

// Dialogflow project ID
const projectId = process.env.DIALOGFLOW_PROJECT_ID;

if (!projectId) {
  console.error('DIALOGFLOW_PROJECT_ID is not set. Please set the environment variable.');
  process.exit(1); // Exit if project ID is not available
} else {
  console.log('Using Dialogflow project ID:', projectId);
}

// Initialize the Dialogflow SessionClient once and reuse it for the application lifecycle
const sessionClient = new dialogflow.SessionsClient();
console.log('Dialogflow client successfully initialized.');

// Dialogflow webhook endpoint
app.post('/webhook', async (req, res) => {
  const userInput = req.body.message || req.body.queryResult?.queryText; // Get user input
  if (!userInput) {
    return res.status(400).json({ error: 'No user input found in the request' });
  }

  console.log(`User input: ${userInput}`);

  // Check if session ID exists in the session, if not generate a new one
  if (!req.session.dialogflowSessionId) {
    req.session.dialogflowSessionId = uuid.v4();
    console.log(`Generated new session ID: ${req.session.dialogflowSessionId}`);
  } else {
    console.log(`Reusing existing session ID: ${req.session.dialogflowSessionId}`);
  }

  const sessionId = req.session.dialogflowSessionId;
  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
  console.log('Session Path:', sessionPath);

  // The text query request to Dialogflow
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: userInput, //
