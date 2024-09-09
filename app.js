const express = require('express');
const bodyParser = require('body-parser');
const dialogflow = require('@google-cloud/dialogflow');
const cors = require('cors'); // Import cors
const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(cors()); // Enable CORS for all routes

// Dialogflow webhook endpoint
app.post('/webhook', async (req, res) => {
  const userInput = req.body.message || req.body.queryResult?.queryText; // Get user input
  if (!userInput) {
    return res.status(400).json({ error: 'No user input found in the request' });
  }

  console.log(`User input: ${userInput}`);

  // The text query request to Dialogflow (without session management)
  const request = {
    queryInput: {
      text: {
        text: userInput, // The user's query
        languageCode: 'en',
      },
    },
    queryParams: {
      timeZone: 'America/Los_Angeles', // You can set the time zone if needed
    },
  };

  try {
    console.log('Sending request to Dialogflow:', request);

    // Send the request to Dialogflow and get the response
    const dialogflowClient = new dialogflow.SessionsClient();
    const responses = await dialogflowClient.detectIntent({
      session: `projects/${process.env.DIALOGFLOW_PROJECT_ID}/agent/sessions/12345`, // Use a static session ID if desired
      ...request,
    });
    const result = responses[0]?.queryResult;

    if (!result) {
      throw new Error('No response from Dialogflow');
    }

    const fulfillmentText = result.fulfillmentText;

    console.log('Dialogflow response:', fulfillmentText);

    // **Console log the conversation**
    console.log('Conversation:');
    console.log(`User: ${userInput}`);
    console.log(`Bot: ${fulfillmentText}`);
    console.log('-------------------------------------');

    // Send the Dialogflow response back to the frontend
    res.json({
      fulfillmentText: fulfillmentText,
    });
  } catch (error) {
    console.error('Error communicating with Dialogflow:', error);
    res.status(500).json({ error: 'Error communicating with Dialogflow' });
  }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});
