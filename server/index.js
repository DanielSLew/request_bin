const express = require('express');
const bodyParser = require('body-parser');
const pgClient = require('pg').Client;
const { v4: uuidv4 } = require('uuid');

let { MongoClient } = require('mongodb');

const url = process.env.MONGO_URL;
const pgConfig = {
  database: process.env.DATABASE,
};

const app = express();

const PORT = process.env.PORT || 8080;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const createBin = async (req, res) => {
  const pgDB = new pgClient(pgConfig);
  let result;

  try {
    await pgDB.connect();
    const values = [req.body.name, uuidv4()];
    result = await pgDB.query('INSERT INTO bins(name, path_name) VALUES($1, $2) RETURNING *', values);
  } catch (e) {
    console.error(e);
  } finally {
    await pgDB.end();

    result ? res.json({ bin: result.rows[0] }) : res.sendStatus(400);
  }
}

const captureEvent = async (req, res) => {
  const mongoDB = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
  const pgDB = new pgClient(pgConfig);

  const bin = req.body.bin_id;
  let result;

  try {
    await mongoDB.connect();
    await pgDB.connect();
    const db = mongoDB.db('events');
    const collection = db.collection('data');
    result = await collection.insertOne(req.body);
    result = pgDB.query('INSERT INTO events(bin_id, doc_id) VALUES($1, $2)', [bin, result.insertedId]);
  } catch (e) {
    console.error(e);
  } finally {
    await mongoDB.close();
    await pgDM.end();

    result ? res.sendStatus(200) : res.sendStatus(400);
  }
}

const getData = async (req, res) => {
  const mongoClient = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
  let collection;

  try {
    await mongoClient.connect();
    const db = mongoClient.db('request_bin_clone');
    collection = await db.collection('endpoints').find().toArray();
  } catch (e) {
    console.error(e);
  } finally {
    await mongoClient.close();
    
    collection ? res.json(collection) : res.sendStatus(400);
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