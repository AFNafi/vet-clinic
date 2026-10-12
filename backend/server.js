const express = require('express');
const path = require('path');
require('dotenv').config();

const apiRouter = require('./routes/api');
const authRouter = require('./routes/auth');
const { closeDatabase, initializeDatabase } = require('./database');

const app = express();
const port = Number(process.env.PORT) || 3000;
const frontendDirectory = path.join(__dirname, '..', 'frontend', 'public');

app.use(express.json());
app.use(express.static(frontendDirectory));
app.use('/api/auth', authRouter.router);
app.use('/api', apiRouter);

// Unknown API routes answer as JSON instead of falling through to the HTML page.
app.use('/api', (request, response) => {
  response.status(404).json({ error: 'Not found' });
});

app.get('/{*path}', (request, response) => {
  response.sendFile(path.join(frontendDirectory, 'index.html'));
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

if (require.main === module) {
  initializeDatabase()
    .then(() => {
      const server = app.listen(port, () => {
        console.log(`Vetwise Clinic console running at http://localhost:${port}`);
      });
      const shutdown = () => {
        server.close(async (error) => {
          try {
            await closeDatabase();
          } catch (closeError) {
            console.error('Failed to close the Oracle connection pool.', closeError);
            process.exitCode = 1;
          }
          if (error) {
            console.error('Failed to stop the HTTP server.', error);
            process.exitCode = 1;
          }
        });
      };
      process.once('SIGINT', shutdown);
      process.once('SIGTERM', shutdown);
    })
    .catch((error) => {
      console.error('Failed to connect to Oracle. The backend was not started.', error);
      process.exitCode = 1;
    });
}

module.exports = app;
