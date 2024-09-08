const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import the cors middleware
const app = express();
const port = process.env.PORT || 5000;

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON requests
app.use(bodyParser.json());

// Dialogflow webhook endpoint
app.post('/webhook', (req, res) => {
  const userInput = req.body.message || req.body.queryResult.queryText;

  console.log(`User input: ${userInput}`);

  // Dummy response for now
  const botResponse = `You said: "${userInput}"`;

  res.json({
    fulfillmentText: botResponse,
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
