const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight requests for all routes

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
  userId: String,
  username: String,
  start: String,
  end: String,
  price: Number,
  createdAt: Date,
  validationStatus: Boolean,
  computeId: String,
  storeId: String,
  collectionAddress: String
});

// Pass model
const Pass = mongoose.model('Pass', {
  passId: {
    type: Number,
    min: 1000,
    max: 9999
  },
  userId: String,
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
      if (!user.authStatus) {
        res.json({ 
          userId: user.userId,
          username: user.username, 
          petraWallet: user.petraWallet, 
          metamask: user.metamask,
          authStatus: user.authStatus,
          requiresAadhaar: true
        });
      } else {
        res.json({ 
          userId: user.userId,
          username: user.username, 
          petraWallet: user.petraWallet, 
          metamask: user.metamask,
          authStatus: user.authStatus,
          requiresAadhaar: false
        });
      }
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error logging in' });
  }
});

// Update auth status route
app.post('/update-auth-status', async (req, res) => {
  const { username } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user) {
      user.authStatus = true;
      await user.save();
      res.json({ message: 'Auth status updated successfully' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error updating auth status' });
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
// Get tickets route

app.post('/tickets', async (req, res) => {
  const { userId, username, start, end, price } = req.body;
  try {
    const ticketId = Math.floor(1000 + Math.random() * 9000);
    
    // First API call
    const createProgramResponse = await fetch('https://637b-103-216-234-205.ngrok-free.app/create_program', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ seed: username }),
    });
    
    if (!createProgramResponse.ok) {
      throw new Error(`HTTP error! status: ${createProgramResponse.status}`);
    }
    
    const createProgramData = await createProgramResponse.json();
    const { user_id, program_id } = createProgramData;
    
    // Second API call
    const generateOtpResponse = await fetch('https://637b-103-216-234-205.ngrok-free.app/store_secrets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user_id,
        program_id: program_id,
        seed: username,
        ticket_code: ticketId
      }),
    });
    
    if (!generateOtpResponse.ok) {
      throw new Error(`HTTP error! status: ${generateOtpResponse.status}`);
    }
    
    const generateOtpData = await generateOtpResponse.json();
    const { program_id: computeId, party_ids_to_store_ids: storeId } = generateOtpData;
    
    const newTicket = new Ticket({
      ticketId,
      userId,
      username,
      start,
      end,
      price,
      createdAt: new Date(),
      validationStatus: false,
      computeId,
      storeId
    });
    
    await newTicket.save();

    // Fetch user's Aptos address
    const user = await User.findOne({ username });
    if (!user) {
      throw new Error('User not found');
    }

    // Mint NFT
    const mintResponse = await fetch('http://637b-103-216-234-205.ngrok-free.app/mint_identicket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        aptos_address: user.petraWallet,
        ticket_id: ticketId
      }),
    });

    if (!mintResponse.ok) {
      throw new Error(`HTTP error! status: ${mintResponse.status}`);
    }

    const mintData = await mintResponse.json();
    newTicket.collectionAddress = mintData.collection_address;
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
  const { userId, username, price, validUntil } = req.body;
  try {
    const passId = Math.floor(1000 + Math.random() * 9000);
    const newPass = new Pass({
      passId,
      userId,
      username,
      price,
      validUntil: new Date(validUntil),
      createdAt: new Date(),
      validationStatus: false,
      computeId: '',
      storeId: ''
    });
    await newPass.save();
    console.log('Pass created successfully:', newPass);
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


app.post('/ticket/:id/validate', async (req, res) => {
  const { id } = req.params;
  try {
    const ticket = await Ticket.findOne({ ticketId: parseInt(id) });
    if (ticket) {
      ticket.validationStatus = true;
      await ticket.save();
      res.json({ message: 'Ticket validated successfully' });
    } else {
      res.status(404).json({ error: 'Ticket not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error validating ticket' });
  }
});

const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/generate-tts', async (req, res) => {
  const { text } = req.body;
  console.log(text);
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });
    console.log(mp3);
    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    res.set('Content-Type', 'audio/mpeg');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating TTS:', error);
    res.status(500).json({ error: 'Error generating TTS' });
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