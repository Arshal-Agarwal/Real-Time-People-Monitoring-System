const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Store connected clients
let clients = new Set();
let currentCount = 0;

// Basic Route
app.get("/", (req, res) => {
  res.send(`Welcome to ${process.env.APP_NAME}`);
});

// SSE endpoint for frontend to connect
app.get('/api/events', cors(), (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send current count immediately on connection
  const initialData = {
    count: currentCount,
    message: `Current count is ${currentCount}`,
    type: currentCount >= 4 ? 'danger' : 'info',
    timestamp: new Date().toISOString()
  };
  res.write(`data: ${JSON.stringify(initialData)}\n\n`);

  // Add client to connected clients
  clients.add(res);

  req.on('close', () => {
    clients.delete(res);
  });
});

// Notification endpoint that Python will call with count updates
app.post('/api/notify', cors(), async (req, res) => {
  try {
    const { count } = req.body;
    
    if (count === undefined) {
      return res.status(400).json({ error: 'Count value is required' });
    }

    currentCount = parseInt(count);
    
    const notification = {
      count: currentCount,
      message: currentCount >= 4 ? 
        `Warning: Maximum capacity exceeded! Current count: ${currentCount}` : 
        `Current count: ${currentCount}`,
      type: currentCount >= 4 ? 'danger' : 'info',
      timestamp: new Date().toISOString()
    };

    // Send to all connected clients
    clients.forEach(client => {
      client.write(`data: ${JSON.stringify(notification)}\n\n`);
    });

    res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
