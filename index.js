const express = require('express');
const Redis = require('ioredis');
const path = require('path');
require('dotenv').config();

const app = express();
const redis = new Redis(process.env.REDIS_URL);

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to parse POST data
app.use(express.urlencoded({ extended: true }));

// Render the main page
app.get('/', (req, res) => {
  res.render('index', { dataWithE: [], dataWithISOString: [], dataWithoutEAndISOString: [] });
});

// Extract data from Redis
app.post('/extract', async (req, res) => {
  try {
    // Fetch all keys from Redis
    const keys = await redis.keys('*');

    // Fetch values and data type for each key
    const dataWithE = [];
    const dataWithISOString = [];
    const dataWithoutEAndISOString = [];

    for (const key of keys) {
      const type = await redis.type(key);
      let value;

      if (type === 'string') {
        value = await redis.get(key);
      } else if (type === 'hash') {
        value = await redis.hgetall(key);
      } else if (type === 'list') {
        value = await redis.lrange(key, 0, -1);
      } else if (type === 'set') {
        value = await redis.smembers(key);
      } else if (type === 'zset') {
        value = await redis.zrange(key, 0, -1, 'WITHSCORES');
      }

      const entry = { key, type, value };

      if (typeof value === 'string' && value.includes('E')) {
        dataWithE.push(entry);
      } else if (typeof value === 'string' && new Date(value).toString() !== 'Invalid Date') {
        dataWithISOString.push(entry);
      } else {
        dataWithoutEAndISOString.push(entry);
      }
    }

    // Render the main page with the extracted data
    res.render('index', { dataWithE, dataWithISOString, dataWithoutEAndISOString });
  } catch (error) {
    console.error('Error extracting data from Redis:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Delete specific data from Redis
app.post('/delete', async (req, res) => {
  try {
    const key = req.body.key;

    // Delete the specified key from Redis
    await redis.del(key);

    // Redirect back to the main page
    res.redirect('/');
  } catch (error) {
    console.error('Error deleting data from Redis:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
