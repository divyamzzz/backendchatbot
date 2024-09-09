require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const dialogflow = require('@google-cloud/dialogflow');
const uuid = require('uuid');
const fs = require('fs');
const cors = require('cors');  // Import CORS package
const session = require('express-session');

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS for all origins (or specify particular origins in the options)
app.use(cors());

// Parse JSON requests
app.use(bodyParser.json());

// Configure session management
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1-day session expiry
}));

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

let sessionClient;

// Try to initialize the Dialogflow client and log if it's loaded
try {
  sessionClient = new dialogflow.SessionsClient();
  console.log('Dialogflow client successfully initialized.');
} catch (error) {
  console.error('Error initializing Dialogflow client:', error);
  process.exit(1); // Exit if client initialization fails
}

// Get the service account details
try {
  const credentials = JSON.parse(serviceAccountKey);
  console.log('Using service account:', credentials.client_email);
} catch (error) {
  console.error('Error parsing service account credentials:', error);
  process.exit(1); // Exit if service account credentials parsing fails
}

// Dialogflow webhook endpoint
app.post('/webhook', async (req, res) => {
  const userInput = req.body.message || req.body.queryResult?.queryText; // Get user input
  if (!userInput) {
    return res.status(400).json({ error: 'No user input found in the request' });
  }

  console.log(`User input: ${userInput}`);

  // Create a new session
  const sessionId = uuid.v4();
  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
  console.log('Session Path:', sessionPath);

  // The text query request to Dialogflow
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: userInput, // The user's query
        languageCode: 'en',
      },
    },
  };

  try {
    console.log('Sending request to Dialogflow:', request);

    // Send the request to Dialogflow and get the response
    const responses = await sessionClient.detectIntent(request);
    const result = responses[0]?.queryResult;

    if (!result) {
      throw new Error('No response from Dialogflow');
    }

    console.log('Dialogflow response:', result.fulfillmentText);

    // Send the Dialogflow response back to the frontend
    res.json({
      fulfillmentText: result.fulfillmentText,
    });
  } catch (error) {
    console.error('Error communicating with Dialogflow:', error);
    res.status(500).json({ error: 'Error communicating with Dialogflow' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
