const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express().use(bodyParser.json());

const token = process.env.TOKEN;
const mytoken = process.env.MYTOKEN;
const port = process.env.PORT || 3005;

// Store processed message IDs to avoid handling the same message multiple times
const processedMessages = new Set();  // Using a Set to track processed message IDs

// Start the Express server
app.listen(port, () => {
    console.log(`Webhook is listening on port ${port}`);
});

// Route for the root path (http://localhost:3005/)
app.get('/', (req, res) => {
    res.status(200).send("Webhook is up and running!");  // Respond with a simple message
});

// Webhook verification (GET method for WhatsApp to verify callback URL)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const challenge = req.query['hub.challenge'];
    const token = req.query['hub.verify_token'];

    if (mode && token) {
        if (mode === 'subscribe' && token === mytoken) {
            console.log('Webhook verified successfully');
            res.status(200).send(challenge);  // Respond with challenge to verify the webhook
        } else {
            console.log('Invalid token');
            res.status(403).send('Forbidden');  // Return 403 if token is invalid
        }
    }
});

// Handle incoming webhook POST requests (messages from WhatsApp)
app.post('/webhook', async (req, res) => {
    const body_param = req.body;

    // Debugging: Log the entire received body for troubleshooting
    console.log('Received payload:', JSON.stringify(body_param, null, 2));

    // Check if the object and message structure are valid
    if (body_param.object) {
        // Check for message events
        if (body_param.entry && body_param.entry[0] && body_param.entry[0].changes && body_param.entry[0].changes[0] && body_param.entry[0].changes[0].value.messages && body_param.entry[0].changes[0].value.messages[0]) {
            const message = body_param.entry[0].changes[0].value.messages[0];
            const phoneNumberId = body_param.entry[0].changes[0].value.metadata.phone_number_id;
            const from = message.from;   // Sender's phone number
            const msgBody = message.text?.body;  // Message content

            // Extract a unique message identifier (e.g., message ID or timestamp)
            const messageId = message.id || message.timestamp;

            // Deduplication: Check if the message has already been processed
            if (processedMessages.has(messageId)) {
                console.log(`Message with ID ${messageId} already processed. Skipping...`);
                return res.sendStatus(200);  // Skip if message is already processed
            }

            // Add the message ID to the processed messages set
            processedMessages.add(messageId);

            // Ensure there is a valid message body
            if (msgBody) {
                console.log(`Received message from ${from}: "${msgBody}"`);

                // Prepare response message
                const responseMessage = `Hey! Welcome to Bringgg, where delivery is seamless. You can visit at https://bringgg.com/ for more details`;

                // Send a response message to the user using the WhatsApp API
                try {
                    const response = await axios.post(
                        `https://graph.facebook.com/v13.0/${phoneNumberId}/messages`,
                        {
                            messaging_product: 'whatsapp',
                            to: from,
                            text: {
                                body: responseMessage
                            }
                        },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            }
                        }
                    );

                    // Log the message that was sent
                    console.log(`Response message sent to ${from}: "${responseMessage}"`);
                    console.log(`Response sent with status: ${response.status}`);

                    res.sendStatus(200);  // Acknowledge that we processed the request successfully

                } catch (error) {
                    console.error('Error while sending response:', error.message);
                    res.status(500).send('Internal Server Error');  // Handle API errors
                }
            } else {
                console.log('No valid message body received');
                res.sendStatus(400);  // Bad request if message body is missing
            }
        }
        // Check for status updates (delivered, read, etc.)
        else if (body_param.entry && body_param.entry[0] && body_param.entry[0].changes && body_param.entry[0].changes[0] && body_param.entry[0].changes[0].value.statuses && body_param.entry[0].changes[0].value.statuses[0]) {
            const status = body_param.entry[0].changes[0].value.statuses[0];
            const recipientId = status.recipient_id;  // Phone number of the recipient
            const statusUpdate = status.status;  // e.g., 'delivered', 'read'

            console.log(`Status update for ${recipientId}: ${statusUpdate}`);
            res.sendStatus(200);  // Acknowledge the receipt of the status update
        } else {
            console.log('Invalid object structure or no valid message/status found');
            res.sendStatus(404);  // Not found if neither message nor status was found
        }
    } else {
        console.log('Invalid object structure');
        res.sendStatus(400);  // Bad request if the object is not valid
    }
});

// Health check endpoint for monitoring the health of the webhook server
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});



// EAAWBFILrd6kBO22p9T4OPkOIedoGOJNsj4PO1hfKlr7nn0DQmSPNN7dzwOZBrOxOyTvwGShui6WMqZA22mz5OgGm88X1Ds4kYywZB6UeulnUZAw6aIRamhFS1KirVqguZBdj6MTkpmGSas3KpZBkpZA2SvKKsH6pqjJGUZACIhcXdIBJQpmh1Ij3wIfHzx4NfVZAB7wZDZD

