require('dotenv').config();
const {createConnection} = require('mysql2/promise');
const fs = require('fs');

(async () => {
  try {
    const sqlContent = fs.readFileSync('./schema.sql', 'utf8');

    const dbConnection = await createConnection({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    const queries = sqlContent.split(';');

    for (const query of queries) {
      if (query.trim() !== '') {
        await dbConnection.execute(query);
      }
    }

    console.log('SQL file executed successfully.');
  } catch (error) {
    console.log('there was an error executing sql queries', error);
  }
  process.exit();
})();

