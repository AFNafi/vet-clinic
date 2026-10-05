const express = require('express');
const path = require('path');
require('dotenv').config();

const apiRouter = require('./routes/api');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', apiRouter);

// Unknown API routes answer as JSON instead of falling through to the HTML page.
app.use('/api', (request, response) => {
  response.status(404).json({ error: 'Not found' });
});

app.get('/{*path}', (request, response) => {
  response.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Vetwise Clinic console running at http://localhost:${port}`);
});
