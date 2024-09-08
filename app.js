const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import CORS middleware
const dialogflow = require('@google-cloud/dialogflow');
const uuid = require('uuid');
const app = express();
const port = 5000;

// Middleware to parse JSON requests
app.use(bodyParser.json());

// Use CORS to allow requests from the React frontend
app.use(cors());

// Create a Dialogflow session client
const projectId = 'newagent-rcgp'; // Replace with your Dialogflow project ID

// Dialogflow webhook endpoint
app.post('/webhook', async (req, res) => {
  const userInput = req.body.message; // Get user input from the request

  // Generate a unique session ID
  const sessionId = uuid.v4();

  // Create a new session for each user query
  const sessionClient = new dialogflow.SessionsClient();
  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

  // The text query request to Dialogflow
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: userInput, // The user query
        languageCode: 'en', // Change language if necessary
      },
    },
  };

  try {
    // Send the request to Dialogflow and get the response
    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;

    // Extract and send Dialogflow's response back to the React frontend
    const botResponse = result.fulfillmentText;
    res.json({
      fulfillmentText: botResponse, // Send Dialogflow's response back
    });
  } catch (error) {
    console.error('Error sending message to Dialogflow:', error);
    res.status(500).json({ error: 'Error communicating with Dialogflow' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
