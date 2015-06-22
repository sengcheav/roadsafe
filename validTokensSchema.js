var pg = require('pg').native
  , connectionString = process.env.DATABASE_URL
  , client
  , query;





 //CREATE DATABASE CONECTION
client = new pg.Client(connectionString);
client.connect();

//CREATE A SCHEMA - users
query = client.query('CREATE TABLE validTokens(token text PRIMARY KEY)');


//CALLBACK TO END DATABASE CONNECTION
query.on('end', function(result) { client.end(); });