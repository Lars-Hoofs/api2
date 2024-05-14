const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const core = require('cors');
const log4js = require('log4js');
const fs = require('fs');



const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(core());




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

// Middleware for logging requests
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

// Dealership endpoints
app.get('/dealerships', (req, res) => {
  db.query('SELECT * FROM Dealership', (err, results) => {
    if (err) {
      logger.error('Er is een fout opgetreden bij het ophalen van de dealerships: ', err);
      res.status(500).send('Er is een interne serverfout opgetreden.');
      return;
    }
    res.json(results);
  });
});

app.get('/dealerships/:id', (req, res) => {
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

app.post('/dealerships', (req, res) => {
  const { name } = req.body;
  db.query('INSERT INTO Dealership (name) VALUES (?)', [name], (err, results) => {
    if (err) {
      logger.error('Er is een fout opgetreden bij het maken van het dealership: ', err);
      res.status(500).send('Er is een interne serverfout opgetreden.');
      return;
    }
    res.json({ id: results.insertId });
    logStream.write(`[${new Date().toISOString()}] Dealership aangemaakt: ${name}\n`);
  });
});

app.put('/dealerships/:id', (req, res) => {
  const dealershipId = req.params.id;
  const { name } = req.body;
  db.query('SELECT name FROM Dealership WHERE id = ?', [dealershipId], (err, results) => {
    if (err) {
      logger.error('Er is een fout opgetreden bij het ophalen van de oude naam: ', err);
      res.status(500).send('Er is een interne serverfout opgetreden.');
      return;
    }
    if (results.length === 0) {
      res.status(404).send('Dealership niet gevonden.');
      return;
    }
    const oldName = results[0].name;
    db.query('UPDATE Dealership SET name = ? WHERE id = ?', [name, dealershipId], (err, results) => {
      if (err) {
        logger.error('Er is een fout opgetreden bij het bijwerken van het dealership: ', err);
        res.status(500).send('Er is een interne serverfout opgetreden.');
        return;
      }
      res.sendStatus(200);
      logStream.write(`[${new Date().toISOString()}] Naam van dealership met ID ${dealershipId} bijgewerkt: ${oldName} -> ${name}\n`);
    });
  });
});

app.delete('/dealerships/:id', (req, res) => {
  const dealershipId = req.params.id;
  db.query('DELETE FROM Dealership WHERE id = ?', [dealershipId], (err, results) => {
    if (err) {
      logger.error('Er is een fout opgetreden bij het verwijderen van het dealership: ', err);
      res.status(500).send('Er is een interne serverfout opgetreden.');
      return;
    }
    res.sendStatus(200);
    logStream.write(`[${new Date().toISOString()}] Dealership verwijderd met ID ${dealershipId}\n`);
  });
});


app.get('/dealerships/:id/cars', (req, res) => {
  const dealershipId = req.params.id;
  db.query('SELECT * FROM Car WHERE dealershipId = ?', [dealershipId], (err, results) => {
    if (err) {
      logger.error('Er is een fout opgetreden bij het ophalen van de auto\'s: ', err);
      res.status(500).send('Er is een interne serverfout opgetreden.');
      return;
    }
    res.json(results);
  });
});

app.get('/dealerships/:id/cars/:carId', (req, res) => {
  const dealershipId = req.params.id;
  const carId = req.params.carId;
  db.query('SELECT * FROM Car WHERE id = ? AND dealershipId = ?', [carId, dealershipId], (err, results) => {
    if (err) {
      logger.error('Er is een fout opgetreden bij het ophalen van de auto: ', err);
      res.status(500).send('Er is een interne serverfout opgetreden.');
      return;
    }
    if (results.length === 0) {
      res.status(404).send('Auto niet gevonden.');
      return;
    }
    res.json(results[0]);
  });
});

app.post('/dealerships/:id/cars', (req, res) => {
  const dealershipId = req.params.id;
  const { make, model } = req.body;
  db.query('INSERT INTO Car (make, model, dealershipId) VALUES (?, ?, ?)', [make, model, dealershipId], (err, results) => {
    if (err) {
      logger.error('Er is een fout opgetreden bij het maken van de auto: ', err);
      res.status(500).send('Er is een interne serverfout opgetreden.');
      return;
    }
    res.json({ id: results.insertId });
    logStream.write(`[${new Date().toISOString()}] Voertuig toegevoegd aan dealership met ID ${dealershipId}: ${make} ${model}\n`);
  });
});

app.put('/dealerships/:id/cars/:carId', (req, res) => {
  const dealershipId = req.params.id;
  const carId = req.params.carId;
  const { make, model } = req.body;
  db.query('UPDATE Car SET make = ?, model = ? WHERE id = ? AND dealershipId = ?', [make, model, carId, dealershipId], (err, results) => {
    if (err) {
      logger.error('Er is een fout opgetreden bij het bijwerken van de auto: ', err);
      res.status(500).send('Er is een interne serverfout opgetreden.');
      return;
    }
    res.sendStatus(200);
    logStream.write(`[${new Date().toISOString()}] Voertuig bijgewerkt van dealership met ID ${dealershipId}: ${make} ${model}\n`);
  });
});

app.delete('/dealerships/:id/cars/:carId', (req, res) => {
  const dealershipId = req.params.id;
  const carId = req.params.carId;
  db.query('DELETE FROM Car WHERE id = ? AND dealershipId = ?', [carId, dealershipId], (err, results) => {
    if (err) {
      logger.error('Er is een fout opgetreden bij het verwijderen van de auto: ', err);
      res.status(500).send('Er is een interne serverfout opgetreden.');
      return;
    }
    res.sendStatus(200);
    logStream.write(`[${new Date().toISOString()}] Voertuig verwijderd van dealership met ID ${dealershipId}: Voertuig ID ${carId}\n`);
  });
});

app.delete('/dealerships/:id/cars', (req, res) => {
  const dealershipId = req.params.id;
  db.query('DELETE FROM Car WHERE dealershipId = ?', [dealershipId], (err, results) => {
    if (err) {
      logger.error('Er is een fout opgetreden bij het verwijderen van de auto\'s: ', err);
      res.status(500).send('Er is een interne serverfout opgetreden.');
      return;
    }
    res.sendStatus(200);
    logStream.write(`[${new Date().toISOString()}] Alle voertuigen verwijderd van dealership met ID ${dealershipId}\n`);
  });
});

app.listen(port, () => {
  logger.info(`Luisteren naar adres: http://localhost:${port}`);
});

// GET /dealerships: Haal alle dealerships op.
//GET /dealerships/:id: Haal een specifiek dealership op.
//POST /dealerships: Maak een nieuwe dealership aan.
//PUT /dealerships/:id: Werk een specifiek dealership bij.
//DELETE /dealerships/:id: Verwijder een specifiek dealership.
//GET /dealerships/:id/cars: Haal alle auto's op van een specifieke dealership.
// GET /dealerships/:id/cars/:carId: Haal een specifieke auto op van een specifieke dealership.
//POST /dealerships/:id/cars: Voeg een nieuwe auto toe aan een specifieke dealership.
// PUT /dealerships/:id/cars/:carId: Werk een specifieke auto bij van een specifieke dealership.
// DELETE /dealerships/:id/cars/:carId: Verwijder een specifieke auto van een specifieke dealership.