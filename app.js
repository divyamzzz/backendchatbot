require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const dialogflow = require('@google-cloud/dialogflow');
const fs = require('fs');
const cors = require('cors'); // Import cors
const app = express();
const port = process.env.PORT || 5000;

// In-memory storage for conversation, number of adults, and state tracking
let conversations = [];
let numberOfAdults = null;  // To store the number of adults (null initially)
let conversationState = 'ASK_ADULTS'; // Initialize state

app.use(bodyParser.json());
app.use(cors()); // Enable CORS for all routes

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
      session: `projects/${projectId}/agent/sessions/12345`, // Use a static session ID if desired
      ...request,
    });
    const result = responses[0]?.queryResult;

    if (!result) {
      throw new Error('No response from Dialogflow');
    }

    console.log('Dialogflow response:', result.fulfillmentText);

    // Conversation Flow Management Based on State
    if (conversationState === 'ASK_ADULTS') {
      // Check if the user has responded with the number of adults
      const adultsMatch = userInput.match(/\d+/); // Check if the user input contains a number
      if (adultsMatch && numberOfAdults === null) {
        numberOfAdults = parseInt(adultsMatch[0], 10); // Set the number of adults once
        conversationState = 'ASK_CHILDREN'; // Move to next state
        console.log(`Number of adults set to: ${numberOfAdults}`);
      } else if (numberOfAdults !== null) {
        console.log("Number of adults is already set and will not be updated.");
        conversationState = 'ASK_CHILDREN'; // Move to the next state even if it is already set
      }
    }

    // Move to the next question based on the state
    if (conversationState === 'ASK_CHILDREN') {
      console.log("Bot is now asking: How many children?");
      conversationState = 'ASK_DATE'; // After this question is answered, ask the next one
    }

    // Store conversation in memory
    const conversation = {
      userInput: userInput,
      botResponse: result.fulfillmentText,
      timestamp: new Date(),
    };

    // Add conversation to the in-memory array
    conversations.push(conversation);

    // Console log the entire conversation along with the number of adults if updated
    console.log('Current conversation history:');
    conversations.forEach((conv, index) => {
      console.log(`\nConversation ${index + 1}`);
      console.log(`User: ${conv.userInput}`);
      console.log(`Bot: ${conv.botResponse}`);
      console.log(`Timestamp: ${conv.timestamp}`);
    });

    console.log(`Current number of adults: ${numberOfAdults}`);

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
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});
