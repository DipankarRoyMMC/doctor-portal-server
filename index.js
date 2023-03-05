const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();

// middleware 
app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
    res.send('doctor portal server is running')
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tmkhisl.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    const appointmentOptionCollection = client.db('doctorPortal').collection('appointmentOptions');
    const bookingCollection = client.db('doctorPortal').collection('bookingOptions');
    try {
        app.get('/apppointmentOptions', async (req, res) => {
            const query = {};
            const options = await appointmentOptionCollection.find(query).toArray();
            res.send(options);
        })

        app.post('/booking', async (req, res) => {
            const booking = req.body;
            console.log(booking);
            const data = await bookingCollection.insertOne(booking);
            res.send(data);

        })
    }
    finally {

    }

}
run().catch(error => console.log(error));




app.listen(port, (req, res) => {
    console.log(`Doctor Portal Server is Running on ${port}`)
})  