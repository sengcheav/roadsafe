var pg = require('pg').native
  , connectionString = process.env.DATABASE_URL
  , client
  , query;


 //CREATE DATABASE CONECTION
client = new pg.Client(connectionString);
client.connect();

var un = 'test';
var pw = '1234';

//CREATE A SCHEMA - users
query = client.query('DROP TABLE users;');
query = client.query('CREATE TABLE users(username text PRIMARY KEY, password text NOT NULL, token text DEFAULT "absent")');

//CALLBACK TO END DATABASE CONNECTION
query.on('end', function(result) { client.end(); });