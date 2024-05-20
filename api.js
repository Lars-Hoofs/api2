import express from 'express';
import bodyParser from 'body-parser';
import mysql from 'mysql';
import cors from 'cors';
import log4js from 'log4js';
import fs from 'fs';
import jwt from 'jsonwebtoken';

const app = express();
const port = 3000;
const secretKey = 'Kaas';

app.use(express.json());
app.use(cors());

log4js.configure({
  appenders: {
    file: { type: 'file', filename: 'logs/server.log' },
    console: { type: 'console' }
  },
  categories: {
    default: { appenders: ['file', 'console'], level: 'debug' }
  }
});

const logger = log4js.getLogger();

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'autodealership'
});

const getCurrentDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
};

const logFileName = `log-${getCurrentDateTime()}.txt`;

const logStream = fs.createWriteStream(logFileName, { flags: 'a' });

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - ${req.ip}`);
  const log = `[${new Date().toISOString()}] ${req.method} ${req.url} [${req.ip}]\n`;
  logStream.write(log);
  next();
});

db.connect((err) => {
  if (err) {
    logger.error('Er is een fout opgetreden bij het verbinden met de database: ', err);
    return;
  }
  logger.info('Verbonden met de database');
});

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, secretKey, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }

      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const user = { username: 'demo' };

  const accessToken = jwt.sign(user, secretKey);
  res.json({ accessToken });
});

app.get('/dealerships', authenticateJWT, (req, res) => {
  db.query('SELECT * FROM Dealership', (err, results) => {
    if (err) {
      logger.error('Er is een fout opgetreden bij het ophalen van de dealerships: ', err);
      res.status(500).send('Er is een interne serverfout opgetreden.');
      return;
    }
    res.json(results);
  });
});

app.get('/dealerships/:id', authenticateJWT, (req, res) => {
  const dealershipId = req.params.id;
  db.query('SELECT * FROM Dealership WHERE id = ?', [dealershipId], (err, results) => {
    if (err) {
      logger.error('Er is een fout opgetreden bij het ophalen van het dealership: ', err);
      res.status(500).send('Er is een interne serverfout opgetreden.');
      return;
    }
    if (results.length === 0) {
      res.status(404).send('Dealership niet gevonden.');
      return;
    }
    res.json(results[0]);
  });
});

app.post('/dealerships', authenticateJWT, (req, res) => {
  const { name } = req.body;
  db.query('INSERT INTO Dealership (name) VALUES (?)', [name], (err, results) => {
    if (err) {
      logger.error('Er is een fout opgetreden bij het maken van het dealership: ', err);
      res.status(500).send('Er is een interne serverfout opgetreden.');
      return;
    }
    res.json({ id: results.insertId });
  });
});

app.put('/dealerships/:id', authenticateJWT, (req, res) => {
  const dealershipId = req.params.id;
  const { name } = req.body;
  db.query('UPDATE Dealership SET name = ? WHERE id = ?', [name, dealershipId], (err, results) => {
    if (err) {
      logger.error('Er is een fout opgetreden bij het bijwerken van het dealership: ', err);
      res.status(500).send('Er is een interne serverfout opgetreden.');
      return;
    }
    res.send('Dealership bijgewerkt.');
  });
});

app.delete('/dealerships/:id', authenticateJWT, (req, res) => {
  const dealershipId = req.params.id;
  db.query('DELETE FROM Dealership WHERE id = ?', [dealershipId], (err, results) => {
    if (err) {
      logger.error('Er is een fout opgetreden bij het verwijderen van het dealership: ', err);
      res.status(500).send('Er is een interne serverfout opgetreden.');
      return;
    }
    res.send('Dealership verwijderd.');
  });
});

app.listen(port, () => {
  logger.info(`API server gestart op http://localhost:${port}`);
});

export default app;
