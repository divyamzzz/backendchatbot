require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const dialogflow = require('@google-cloud/dialogflow');
const uuid = require('uuid');
const fs = require('fs');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// In-memory data store for adults, children, and time
let userData = {};

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

try {
  const credentials = JSON.parse(serviceAccountKey);
  console.log('Using service account:', credentials.client_email);
} catch (error) {
  console.error('Error parsing service account credentials:', error);
  process.exit(1);
}

// Dialogflow webhook endpoint
app.post('/webhook', async (req, res) => {
  const userInput = req.body.message || req.body.queryResult?.queryText;
  if (!userInput) {
    return res.status(400).json({ error: 'No user input found in the request' });
  }

  console.log(`User input: ${userInput}`);

  // Extract the data you need from user input (e.g., adults, children, time)
  // Assuming Dialogflow returns these values from entities or parameters
  const params = req.body.queryResult?.parameters || {};
  const numAdults = params.number_of_adults || 0;
  const numChildren = params.number_of_children || 0;
  const time = params.time || 'unknown';

  // Store data in an in-memory object for now
  userData = {
    adults: numAdults,
    children: numChildren,
    time: time,
  };

  console.log(`Storing data: Adults: ${numAdults}, Children: ${numChildren}, Time: ${time}`);

  // Create a new session
  const sessionId = uuid.v4();
  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
  console.log('Session Path:', sessionPath);

  // The text query request to Dialogflow
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: userInput,
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

    // Send the Dialogflow response back to the frontend, including the user data
    res.json({
      fulfillmentText: result.fulfillmentText,
      storedData: userData,  // Send stored data along with the response
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
