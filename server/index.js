const express = require('express');
const bodyParser = require('body-parser');
const pgClient = require('pg').Client;
const { v4: uuidv4 } = require('uuid');

let { MongoClient } = require('mongodb');

const url = 'mongodb://127.0.0.1:27017';

const app = express();

const PORT = process.env.PORT || 8080

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const createBin = async (req, res) => {
  const pgDB = new pgClient({ database: 'request_bin' });

  try {
    await pgDB.connect();
    const values = [req.body.name, uuidv4()];
    const result = await pgDB.query('INSERT INTO bins(name, path_name) VALUES($1, $2) RETURNING *', values);
    console.log(result);
    res.json({ bin: result.rows[0] });
  } catch (e) {
    console.error(e);
  } finally {
    await pgDB.end();
  }
}

const captureEvent = async (req, res) => {
  const mongoDB = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
  const pgDB = new pgClient({ database: 'daniel' });

  const bin = req.body.bin_id;

  try {
    await mongoDB.connect();
    await pgDB.connect();
    const db = mongoDB.db('request_bin_clone');
    const collection = db.collection('endpoints');
    const result = await collection.insertOne(req.body);
    pgDB.query('INSERT INTO events(bin_id, doc_id) VALUES($1, $2)', [bin, result.insertedId]);
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
  } finally {
    await mongoDB.close();
  }
}

const getData = async (req, res) => {
  const mongoClient = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await mongoClient.connect();
    const db = mongoClient.db('request_bin_clone');
    const collection = await db.collection('endpoints').find().toArray();
    console.log(collection);
    res.json(collection);
  } catch (e) {
    console.error(e);
  } finally {
    await mongoClient.close();
  }  
}

// const getData = (req, res) => {
//   mongoClient(async (req, res) => {
//     const db = client.db('request_bin_clone');
//     const collection = await db.collection('endpoints').find().toArray();
//     console.log(collection);
//     res.json(collection);
//   });
// }

// const mongoClient = async (req, res, callback) => {
//   const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

//   try {
//     await client.connect();
//     callback();
//   } catch (e) {
//     console.error(e);
//   } finally {
//     await client.close();
//   }  
// }

app.get('/', getData)

app.post('/event', captureEvent);

app.post('/bin', createBin);

app.listen(PORT);