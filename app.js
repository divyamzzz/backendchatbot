require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const dialogflow = require('@google-cloud/dialogflow');
const fs = require('fs');
const cors = require('cors'); // Import cors
const app = express();
const port = process.env.PORT || 5000;

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
  // Log the entire request body to inspect the structure
  console.log('Dialogflow Request Body:', JSON.stringify(req.body, null, 2));

  // Check if queryResult and parameters are present in the request
  const queryResult = req.body.queryResult;
  if (!queryResult || !queryResult.parameters) {
    return res.status(400).json({ error: 'Missing queryResult or parameters in the request' });
  }

  // Extract parameters from Dialogflow
  const parameters = queryResult.parameters;
  const numberOfAdults = parameters.number_of_adults || 0;
  const numberOfChildren = parameters.number_of_child || 0;

  // Prices
  const pricePerAdult = 100;
  const pricePerChild = 50;

  // Calculate total price
  const totalPrice = (numberOfAdults * pricePerAdult) + (numberOfChildren * pricePerChild);

  console.log(`User input: ${queryResult.queryText}`);
  console.log(`Number of adults: ${numberOfAdults}, Number of children: ${numberOfChildren}`);
  console.log(`Total price calculated: $${totalPrice}`);

  // Send the total price in the response back to Dialogflow
  const responseText = `The total price for ${numberOfAdults} adults and ${numberOfChildren} children is $${totalPrice}.`;

  // Send the Dialogflow response back to the frontend
  res.json({
    fulfillmentText: responseText,
  });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});
