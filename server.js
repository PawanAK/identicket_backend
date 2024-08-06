require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// User model
const User = mongoose.model('User', {
  userId: String,
  username: String,
  petraWallet: String,
  metamask: String,
  authStatus: Boolean
});

// Ticket model
const Ticket = mongoose.model('Ticket', {
  ticketId: {
    type: Number,
    min: 1000,
    max: 9999
  },
  username: String,
  start: String,
  end: String,
  price: Number,
  createdAt: Date,
  validationStatus: Boolean,
  computeId: String,
  storeId: String
});

// Pass model
const Pass = mongoose.model('Pass', {
  passId: {
    type: Number,
    min: 1000,
    max: 9999
  },
  username: String,
  price: Number,
  validUntil: Date,
  createdAt: Date,
  validationStatus: Boolean,
  computeId: String,
  storeId: String
});

// Signup route
app.post('/signup', async (req, res) => {
  const { username, petraWallet, metamask } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const userId = Math.random().toString(36).substr(2, 9);
    const newUser = new User({ 
      userId, 
      username, 
      petraWallet, 
      metamask, 
      authStatus: false 
    });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully', userId });
  } catch (error) {
    res.status(500).json({ error: 'Error registering user' });
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { username } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user) {
      user.authStatus = true;
      await user.save();
      res.json({ 
        userId: user.userId,
        username: user.username, 
        petraWallet: user.petraWallet, 
        metamask: user.metamask,
        authStatus: user.authStatus
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error logging in' });
  }
});

// Get tickets route
app.get('/tickets', async (req, res) => {
  const { username } = req.query;
  try {
    const userTickets = await Ticket.find({ username });
    res.json(userTickets);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching tickets' });
  }
});

// Get passes route
app.get('/passes', async (req, res) => {
  const { username } = req.query;
  try {
    const userPasses = await Pass.find({ username });
    res.json(userPasses);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching passes' });
  }
});

// Create ticket route
app.post('/tickets', async (req, res) => {
  const { username, start, end, price } = req.body;
  try {
    const ticketId = Math.floor(1000 + Math.random() * 9000);
    const newTicket = new Ticket({
      ticketId,
      username,
      start,
      end,
      price,
      createdAt: new Date(),
      validationStatus: false,
      computeId: '',
      storeId: ''
    });
    await newTicket.save();
    console.log('Ticket created successfully:', newTicket);
    res.status(201).json(newTicket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Error creating ticket', details: error.message });
  }
});

// Create pass route
app.post('/passes', async (req, res) => {
  const { username, price, validUntil } = req.body;
  try {
    const passId = Math.floor(1000 + Math.random() * 9000);
    const newPass = new Pass({
      passId,
      username,
      price,
      validUntil: new Date(validUntil),
      createdAt: new Date(),
      validationStatus: false,
      computeId: '',
      storeId: ''
    });
    await newPass.save();
    res.status(201).json(newPass);
  } catch (error) {
    console.error('Error creating pass:', error);
    res.status(500).json({ error: 'Error creating pass', details: error.message });
  }
});

// Get single ticket route
app.get('/ticket/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const ticket = await Ticket.findOne({ ticketId: parseInt(id) });
    if (ticket) {
      res.json(ticket);
    } else {
      res.status(404).json({ error: 'Ticket not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error fetching ticket' });
  }
});

// Get single pass route
app.get('/pass/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pass = await Pass.findOne({ passId: parseInt(id) });
    if (pass) {
      res.json(pass);
    } else {
      res.status(404).json({ error: 'Pass not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error fetching pass' });
  }
});

// Connect to MongoDB and start the server
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });