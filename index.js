const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express')
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000


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
        if(err){
            return res.status(403).send({message: 'Forbidden access'})
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

        // GET ALL PRODUCTS
        app.get('/product', async (req, res) => {
            const query = {}
            const cursor = productCollection.find(query)
            const product = await cursor.toArray()
            res.send(product)
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
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token })
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
            if(email === decodedEmail){
                const query = { email: email }
                const orders = await manageorderCollection.find(query).toArray()
             return res.send(orders)
            }
            else{
                return res.status(403).send({message: 'forbidden access'})
            }
        })

        // GET SPECIFIC ID ORDER
        app.get('/manageorder/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await manageorderCollection.findOne(query)
            res.send(result)
        })


        // GET SPECIFIC ID PRODUCT
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await productCollection.findOne(query)
            res.send(result)
        })

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