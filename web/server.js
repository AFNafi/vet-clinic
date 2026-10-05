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

// Last stop for errors such as a malformed JSON body. Express 5 recognises an
// error handler by its four arguments, so `next` must stay in the signature.
app.use((error, request, response, next) => {
  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({ errors: ['The request body is not valid JSON.'] });
  }
  console.error(error);
  return response.status(error.status || 500).json({ error: 'Something went wrong.' });
});

app.listen(port, () => {
  console.log(`Vetwise Clinic console running at http://localhost:${port}`);
});
