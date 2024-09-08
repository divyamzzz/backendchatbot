const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 5000;

// Middleware to parse JSON requests
app.use(bodyParser.json());

// Dialogflow webhook endpoint
app.post('/webhook', (req, res) => {
  const userInput = req.body.message || req.body.queryResult.queryText;  // Get user input from request body

  console.log(`User input: ${userInput}`);

  // Dummy response for now, this can be based on the intent detected from Dialogflow
  const botResponse = `You said: "${userInput}"`;

  // Send response back to the React frontend (or to Dialogflow if this is from Dialogflow)
  res.json({
    fulfillmentText: botResponse, // This field is used by Dialogflow, also returned to React
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
