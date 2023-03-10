const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');

require('dotenv').config();

// middleware 
app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
    res.send('doctor portal server is running')
})

function verifyJWT(req, res, next) {
    console.log('inside access token', req.headers.authorization);
    const authHeaders = req.headers.authorization;
    // console.log('show auth Header', authHeaders);
    if (!authHeaders) {
        return res.status(401).send('unauthorization access');
    }

    const token = authHeaders.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ messge: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tmkhisl.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    const appointmentOptionCollection = client.db('doctorPortal').collection('appointmentOptions');
    const bookingCollection = client.db('doctorPortal').collection('bookingOptions');
    const userCollection = client.db('doctorPortal').collection('users');
    const doctorsCollection = client.db('doctorPortal').collection('doctors')
    try {
        app.get('/apppointmentOptions', async (req, res) => {
            const date = req.query.date;
            console.log(date);
            const query = {};
            const options = await appointmentOptionCollection.find(query).toArray();
            const bookingQuery = { appointmentDate: date };
            const alreadyBooked = await bookingCollection.find(bookingQuery).toArray();

            options.forEach(option => {
                const optionBooked = alreadyBooked.filter(book => book.treatementName === option.name);
                const bookedSlots = optionBooked.map(book => book.slot);
                const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot));
                option.slots = remainingSlots;

                console.log(date, option.name, remainingSlots.length)
            });
            res.send(options);
        })

        app.get('/appointmentSpecialty', async (req, res) => {
            const query = {}
            const result = await appointmentOptionCollection.find(query).project({ name: 1 }).toArray();
            res.send(result);
        })

        // require users from database 
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
                return res.send({ accessToken: token })
            }

            res.status(403).send({ accessToken: '' })
            res.send(user);
        })

        // get booking data from server 
        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            console.log(email);
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email };
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
        })
        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const query = {
                appointmentDate: booking.appointmentDate,
                email: booking.email,
                treatementName: booking.treatementName,
            }
            const alreadyBooked = await bookingCollection.find(query).toArray();
            if (alreadyBooked.length) {
                const message = `You already have a booking onl ${booking.appointmentDate} `;
                return res.send({ acknowledged: false, message });
            }
            const data = await bookingCollection.insertOne(booking);
            res.send(data);
        })
        // get users from database 
        app.get('/users', async (req, res) => {
            const query = {}
            const data = await userCollection.find(query).toArray();
            res.send(data);
        })
        // user save on data base post method 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        })
        // update user info 
        app.put('/users/admin/:id', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await userCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'Forbiden Access' })
            }

            const id = req.params.id;
            // console.log(id);
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc, options)
            res.send(result);
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await userCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' })
        })

        app.get('/doctors', async (req, res) => {
            const query = {};
            const result = await doctorsCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/doctors', async (req, res) => {
            const doctor = req.body;
            const result = await doctorsCollection.insertOne(doctor);
            res.send(result);
        })

    }
    finally {

    }

}
run().catch(error => console.log(error));
app.listen(port, (req, res) => {
    console.log(`Doctor Portal Server is Running on ${port}`)
})  