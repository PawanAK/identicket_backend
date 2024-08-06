const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

const dataFilePath = path.join('E:', 'GOA', 'backend', 'data.json');

function readDataFile() {
  if (!fs.existsSync(dataFilePath)) {
    return { users: [], tickets: [], passes: [] };
  }
  const fileContent = fs.readFileSync(dataFilePath, 'utf-8');
  const data = JSON.parse(fileContent);
  
  return {
    users: Array.isArray(data.users) ? data.users : [],
    tickets: Array.isArray(data.tickets) ? data.tickets : [],
    passes: Array.isArray(data.passes) ? data.passes : []
  };
}

function writeDataFile(data) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

app.post('/signup', (req, res) => {
  console.log('Received signup request:', req.body);
  const { username, metamaskAddress, petraAddress } = req.body;
  const data = readDataFile();

  if (data.users.some(user => user.username === username)) {
    console.log('Username already exists:', username);
    return res.status(400).json({ error: 'Username already exists' });
  }

  data.users.push({ username, metamaskAddress, petraAddress });
  writeDataFile(data);

  console.log('User registered successfully:', username);
  res.status(201).json({ message: 'User registered successfully' });
});

app.post('/login', (req, res) => {
  console.log('Received login request:', req.body);
  const { username } = req.body;
  const data = readDataFile();

  const user = data.users.find(user => user.username === username);
  if (user) {
    console.log('User found:', user);
    res.json({ 
      username: user.username, 
      metamaskAddress: user.metamaskAddress, 
      petraAddress: user.petraAddress 
    });
  } else {
    console.log('User not found:', username);
    res.status(404).json({ error: 'User not found' });
  }
});

app.get('/tickets', (req, res) => {
  const { username } = req.query;
  const data = readDataFile();
  const userTickets = data.tickets.filter(ticket => ticket.username === username);
  res.json(userTickets);
});

app.get('/passes', (req, res) => {
  const { username } = req.query;
  const data = readDataFile();
  const userPasses = data.passes.filter(pass => pass.username === username);
  res.json(userPasses);
});

app.post('/tickets', (req, res) => {
  console.log('Received ticket creation request:', req.body);
  const { username, start, end, dailyPass, price } = req.body;
  const data = readDataFile();
  const newTicket = {
    id: Date.now().toString(),
    username,
    start,
    end,
    dailyPass,
    price,
    createdAt: new Date().toISOString()
  };
  data.tickets.push(newTicket);
  writeDataFile(data);
  console.log('New ticket created:', newTicket);
  res.status(201).json(newTicket);
});

app.post('/passes', (req, res) => {
  const { username, price, validUntil } = req.body;
  const data = readDataFile();
  const newPass = {
    id: Date.now().toString(),
    username,
    price,
    validUntil,
    createdAt: new Date().toISOString()
  };
  data.passes.push(newPass);
  writeDataFile(data);
  res.status(201).json(newPass);
});

app.get('/ticket/:id', (req, res) => {
  const { id } = req.params;
  const data = readDataFile();
  const ticket = data.tickets.find(ticket => ticket.id === id);
  if (ticket) {
    res.json(ticket);
  } else {
    res.status(404).json({ error: 'Ticket not found' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});