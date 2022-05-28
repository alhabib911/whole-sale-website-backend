const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
console.log(process.env.STRIPE_SECRET_KEY);

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qypq1.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorozed access' })
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded
        next()
    });
}



async function run() {
    try {
        await client.connect()
        const productCollection = client.db('kelong').collection('products')
        const manageorderCollection = client.db('kelong').collection('manageorder')
        const userCollection = client.db('kelong').collection('users')
        const userUpdateCollection = client.db('kelong').collection('update')
        const reviewCollection = client.db('kelong').collection('review')
        const paymentCollection = client.db('kelong').collection('payments');

        // Get Product
        app.get('/product', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const cursor = productCollection.find(query)
            const product = await cursor.toArray()
            res.send(product)
        })


        // GET ALL REVIEW
        app.get('/review', async (req, res) => {
            const query = {}
            const cursor = reviewCollection.find(query)
            const review = await cursor.toArray()
            res.send(review)
        })



        // GET ALL Review
        app.get('/review', verifyJWT, async (req, res) => {
            const email = req.query.email
            const authorization = req.headers.authorization
            const decodedEmail = req.decoded.email
            if (email === decodedEmail) {
                const query = { email: email }
                const reviews = await reviewCollection.find(query).toArray()
                return res.send(reviews)
            }
            else {
                return res.status(403).send({ message: 'forbidden access' })
            }
        })



        // Add new Review
        app.post('/review', async (req, res) => {
            const newReview = req.body
            console.log('add', newReview)
            const review = await reviewCollection.insertOne(newReview)
            res.send(review)
        })


        // GET EMAIL USER REVIEW  
        app.get('/review/:email', async (req, res) => {
            const email = req.params.email;
            const result = await reviewCollection.findOne({ email: email });
            // const users = await userCollection.find().toArray()
            res.send(result)
        })



        // Add new Product
        app.post('/product', async (req, res) => {
            const newProduct = req.body
            console.log('add', newProduct)
            const result = await productCollection.insertOne(newProduct)
            res.send(result)
        })

        // GET CREATE USER EMAIL
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email }
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options)
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15d' })
            res.send({ result, token })
        })

        // GET UPDATE INFO SEND FOR UI  
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email })
            // const users = await userCollection.find().toArray()
            res.send(user)
        })


        // MAKE AN ADMIN
        app.put('/user/admin/:email', async (req, res) => {
            const email = req.params.email
            const filter = { email: email }
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        // ADMIN CHECK FOR REQUIRE ADMIN
        app.get('/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        // CUSTOMER CHECK FOR REQUIRE CUSTOMER
        app.get('/customer/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isCustomer = user.role !== 'admin';
            res.send({ customer: isCustomer })
        })

        // GET ALL USER
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray()
            res.send(users)
        })


        // All Order Quantity
        app.post('/manageorder', async (req, res) => {
            const newOrder = req.body
            const result = await manageorderCollection.insertOne(newOrder)
            res.send(result)
        })

        // GET ALL ORDER
        app.get('/manageorder', verifyJWT, async (req, res) => {
            const email = req.query.email
            const authorization = req.headers.authorization
            const decodedEmail = req.decoded.email
            if (email === decodedEmail) {
                const query = { email: email }
                const orders = await manageorderCollection.find(query).toArray()
                return res.send(orders)
            }
            else {
                return res.status(403).send({ message: 'forbidden access' })
            }
        })

        // GET SPECIFIC ID ORDER
        app.get('/manageorder/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const order = await manageorderCollection.findOne(query)
            res.send(order)
        })


        // GET SPECIFIC ID PRODUCT
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await productCollection.findOne(query)
            res.send(result)
        })




        // Delete Product
        app.delete('/product/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await productCollection.deleteOne(query)
            res.send(result)
        })

        // Update Product
        app.put('/product/:id', async(req, res) =>{
            const id = req.params.id;
            const updateProduct = req.body;
            const filter = {_id: ObjectId(id)};
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    quantity: updateProduct.quantity
                }
            };
            const result = await productCollection.updateOne(filter, updatedDoc, options);
            res.send(result);

        })

        // PAYMENT GATEWAY INTEGRATION
        app.post('/create-payment-intent', verifyJWT, async(req, res) =>{
            const service = req.body;
            const price = service.price;
            const amount = price*100;
            const paymentIntent = await stripe.paymentIntents.create({
              amount : amount,
              currency: 'usd',
              payment_method_types:['card']
            });
            res.send({clientSecret: paymentIntent.client_secret})
          });





    }
    finally {

    }
}

run().catch(console.dir)



app.get('/', (req, res) => {
    res.send('Hello From Kelong Group!')
})

app.listen(port, () => {
    console.log(`Kelong app listening on port ${port}`)
})