const express = require('express');
const bodyParser = require('body-parser');
const pgClient = require('pg').Client;
const { v4: uuidv4 } = require('uuid');

let { MongoClient } = require('mongodb');

const url = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
const pgConfig = {
  database: process.env.DATABASE || 'request_bin',
};

const app = express();

const PORT = process.env.PORT || 8080;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const info = {
  PURPOSE: 'Test your API endpoints and inspect what your payload is, start by creating a bin',
  INSTRUCTIONS: {
    create_bin: 'Send post request to /bins, including { name: <name or description> } in body, this will help you remember what the bin was for. It will return a new bin_path',
    capture_event: 'Send post request to /:bin_path including your payload',
    see_bins: 'Send get request to /bins',
    see_bin_events: 'Send get request to /:bin_path',
  }
}

const createBin = async (req, res) => {
  const pgDB = new pgClient(pgConfig);
  let result;

  try {
    await pgDB.connect();
    const values = [req.body.name, uuidv4()];
    result = await pgDB.query('INSERT INTO bins(name, path_name) VALUES($1, $2) RETURNING *', values);
  } catch (e) {
    console.error(e);
    res.status(400);
  } finally {
    await pgDB.end();

    if (res.statusCode == 400) res.send();
    res.json({ NEW_BIN_PATH: result.rows[0].path_name });
  }
}

const captureEvent = async (req, res) => {
  const mongoDB = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
  const pgDB = new pgClient(pgConfig);

  const bin_path = req.params.endpoint;

  try {
    await mongoDB.connect();
    await pgDB.connect();

    const db = mongoDB.db('events');
    const collection = db.collection('data');

    const bin = await pgDB.query('SELECT id FROM bins WHERE path_name = $1', [bin_path]);
    const bin_id = bin.rows[0].id;

    const result = await collection.insertOne({ bin_id, ...req.body });
    await pgDB.query('INSERT INTO events(bin_id, doc_id) VALUES($1, $2)', [bin_id, result.insertedId]);
    res.status(200);
  } catch (e) {
    console.error(e);
    res.status(400);
  } finally {
    await mongoDB.close();
    await pgDB.end();

    res.send();
  }
}

const getBins = async (req, res) => {
  const pgDB = new pgClient(pgConfig); 
  let result;

  try {
    await pgDB.connect();
    result = await pgDB.query('SELECT * FROM bins');
  } catch (e) {
    console.error(e);
  } finally {
    await pgDB.end();

    result ? res.json({ 'ALL_BINS': result.rows }) : res.sendStatus(400);
  }
}

const getBinData = async (req, res) => {
  const mongoDB = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
  const pgDB = new pgClient(pgConfig);
  
  const bin_path = req.params.bin_path;
  let bin_id;

  try {
    await mongoDB.connect();
    await pgDB.connect();
    const db = mongoDB.db('events');

    const bin = await pgDB.query('SELECT id FROM bins WHERE path_name = $1', [bin_path]);
    bin_id = bin.rows[0].id;
    
    collection = await db.collection('data').find({ "bin_id": bin_id }).toArray();
  } catch (e) {
    console.error(e);
    res.status(400);
  } finally {
    await mongoDB.close();
    await pgDB.end();

    if (res.statusCode == 400) res.send();
    
    res.json({ ['BIN_' + bin_path]: collection });
  }  
}

const getInfo = (req, res) => {
  res.json(info);
}

app.get('/bins', getBins);
app.get('/:bin_path', getBinData);
app.get('/', getInfo);

app.post('/bins', createBin);
app.post('/:endpoint', captureEvent);

app.listen(PORT);