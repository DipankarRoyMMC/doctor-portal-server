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
    }
    finally {

    }

}
run().catch(error => console.log(error));




app.listen(port, (req, res) => {
    console.log(`Doctor Portal Server is Running on ${port}`)
})  