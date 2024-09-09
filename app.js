require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const dialogflow = require('@google-cloud/dialogflow');
const cors = require('cors'); // Import CORS middleware
const uuid = require('uuid');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 5000;

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON requests
app.use(bodyParser.json());

// Create the service account credentials dynamically from the environment variable
const serviceAccountKey = process.env.GOOGLE_APPLICATION_CREDENTIALS_CONTENTS;

if (serviceAccountKey) {
  const serviceAccountPath = './google-credentials.json';
  fs.writeFileSync(serviceAccountPath, serviceAccountKey);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
}

// Dialogflow project ID from environment variable
const projectId = process.env.DIALOGFLOW_PROJECT_ID;

// Dialogflow webhook endpoint
app.post('/webhook', async (req, res) => {
  const userInput = req.body.message || req.body.queryResult.queryText; // Get user input from the request

  console.log(`User input: ${userInput}`);

  // Create a new session
  const sessionId = uuid.v4();
  const sessionClient = new dialogflow.SessionsClient();
  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

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
    // Send the request to Dialogflow and get the response
    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;

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
