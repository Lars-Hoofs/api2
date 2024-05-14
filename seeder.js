const mysql = require('mysql');
const log4js = require('log4js');

log4js.configure({
    appenders: {
        file: { type: 'file', filename: 'logs/seeder.log' },
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

db.connect((err) => {
    if (err) {
        logger.error('Error connecting to the database: ', err);
        return;
    }
    logger.info('Connected to the database');
    seedDatabase();
});

const seedDatabase = () => {
    const dealerships = [
        { name: 'Auto World' },
        { name: 'Car Nation' },
        { name: 'Drive Time' },
        { name: 'Elite Motors' },
        { name: 'Prime Cars' }
    ];

    const cars = [
        { make: 'Toyota', model: 'Corolla' },
        { make: 'Honda', model: 'Civic' },
        { make: 'Ford', model: 'Mustang' },
        { make: 'Chevrolet', model: 'Malibu' },
        { make: 'Tesla', model: 'Model 3' }
    ];

    let totalQueries = dealerships.length * (1 + cars.length); // Total number of queries to execute
    let completedQueries = 0;

    const checkCompletion = () => {
        completedQueries++;
        if (completedQueries === totalQueries) {
            db.end(err => {
                if (err) {
                    logger.error('Error closing the database connection: ', err);
                    return;
                }
                logger.info('Database connection closed');
            });
        }
    };

    dealerships.forEach(dealership => {
        db.query('INSERT INTO Dealership (name) VALUES (?)', [dealership.name], (err, results) => {
            if (err) {
                logger.error('Error inserting dealership: ', err);
                checkCompletion();
                return;
            }
            const dealershipId = results.insertId;
            logger.info(`Inserted dealership with ID: ${dealershipId}`);
            checkCompletion();

            cars.forEach(car => {
                db.query('INSERT INTO Car (make, model, dealershipId) VALUES (?, ?, ?)', [car.make, car.model, dealershipId], (err, results) => {
                    if (err) {
                        logger.error('Error inserting car: ', err);
                    } else {
                        logger.info(`Inserted car ${car.make} ${car.model} into dealership with ID: ${dealershipId}`);
                    }
                    checkCompletion();
                });
            });
        });
    });
};
