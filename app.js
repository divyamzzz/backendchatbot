require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const dialogflow = require('@google-cloud/dialogflow');
const fs = require('fs');
const uuid = require('uuid');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');

app.use(cors());
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
  process.exit(1);
}

// Dialogflow project ID
const projectId = process.env.DIALOGFLOW_PROJECT_ID;

if (!projectId) {
  console.error('DIALOGFLOW_PROJECT_ID is not set. Please set the environment variable.');
  process.exit(1);
} else {
  console.log('Using Dialogflow project ID:', projectId);
}

let sessionClient;

try {
  sessionClient = new dialogflow.SessionsClient();
  console.log('Dialogflow client successfully initialized.');
} catch (error) {
  console.error('Error initializing Dialogflow client:', error);
  process.exit(1);
}

// Dialogflow webhook endpoint
app.post('/webhook', async (req, res) => {
  const userInput = req.body.message || req.body.queryResult?.queryText; // Get user input
  let sessionId = req.body.sessionId; // Expect sessionId to be passed from the client
  if (!sessionId) {
    // If no session ID is passed, generate a new one (used only when there's no active session)
    sessionId = uuid.v4();
  }

  if (!userInput) {
    return res.status(400).json({ error: 'No user input found in the request' });
  }

  console.log(`User input: ${userInput}`);
  console.log(`Session ID: ${sessionId}`);

  // Reuse the session ID provided by the client or generated
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
      sessionId: sessionId, // Return sessionId for the client to reuse
    });
  } catch (error) {
    console.error('Error communicating with Dialogflow:', error);
    res.status(500).json({ error: 'Error communicating with Dialogflow', details: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
