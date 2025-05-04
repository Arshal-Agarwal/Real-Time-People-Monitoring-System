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
let threshold = 5; // Default threshold

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
    type: currentCount >= 5 ? 'danger' : 'info',
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
      message: currentCount >= 5 ? 
        `Warning: Maximum capacity exceeded! Current count: ${currentCount}` : 
        `Current count: ${currentCount}`,
      type: currentCount >= 5 ? 'danger' : 'info',
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

// Endpoint to update threshold
app.post('/api/threshold', cors(), async (req, res) => {
  try {
    const { value } = req.body;
    
    if (value === undefined || value < 1) {
      return res.status(400).json({ error: 'Valid threshold value is required' });
    }

    threshold = parseInt(value);
    
    // Notify all clients about threshold change
    const notification = {
      count: currentCount,
      message: `Threshold updated to ${threshold}`,
      type: currentCount >= threshold ? 'danger' : 'info',
      threshold: threshold,
      timestamp: new Date().toISOString()
    };

    clients.forEach(client => {
      client.write(`data: ${JSON.stringify(notification)}\n\n`);
    });

    res.status(200).json({ success: true, threshold });
  } catch (error) {
    console.error('Threshold update error:', error);
    res.status(500).json({ error: 'Failed to update threshold' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
