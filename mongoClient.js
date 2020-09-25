const { MongoClient } = require('mongodb');
const url = 'mongodb://127.0.0.1:27017';

const mongoClient = async (callback) => {
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    callback();
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }  
}

exports.mongoClient = mongoClient;
