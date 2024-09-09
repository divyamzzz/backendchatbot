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
  try {
    fs.writeFileSync(serviceAccountPath, serviceAccountKey);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
    console.log('Service account credentials successfully written to', serviceAccountPath);
  } catch (err) {
    console.error('Error writing service account credentials:', err);
    process.exit(1); // Exit if credentials can't be written
  }
} else {
  console.error('GOOGLE_APPLICATION_CREDENTIALS_CONTENTS is not set');
  process.exit(1); // Exit if credentials are not available
}

// Check if the project ID environment variable is set
const projectId = process.env.DIALOGFLOW_PROJECT_ID;
if (!projectId) {
  console.error('DIALOGFLOW_PROJECT_ID environment variable is not set');
  process.exit(1);
} else {
  console.log('Using Dialogflow project ID:', projectId);
}

// Dialogflow webhook endpoint
app.post('/webhook', async (req, res) => {
  const userInput = req.body.message || req.body.queryResult?.queryText; // Get user input from the request
  if (!userInput) {
    return res.status(400).json({ error: 'No user input found in the request' });
  }

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

    // Check if it's an authentication error
    if (error.code === 7) {
      console.error('IAM permission error. Ensure the service account has the necessary permissions.');
    }

    res.status(500).json({ error: 'Error communicating with Dialogflow', details: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
