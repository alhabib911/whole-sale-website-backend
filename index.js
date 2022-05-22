const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express')
const cors = require('cors');
require ('dotenv').config()
const app = express()
const port = process.env.PORT || 5000


app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qypq1.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try{
        await client.connect()
        const productCollection = client.db('kelong').collection('products')
        const manageorderCollection = client.db('kelong').collection('manageorder')

        // GET ALL PRODUCTS
        app.get('/product', async(req, res) =>{
            const query = {}
            const cursor = productCollection.find(query)
            const product = await cursor.toArray()
            res.send(product)
        })

        // All Order Quantity
        app.post('/manageorder', async(req, res) => {
            const newOrder =req.body
             const result =await manageorderCollection.insertOne(newOrder)
            res.send(result)
        })

        // GET SPECIFIC ID ORDER
        /* app.get('/manageorder/:id', async(req, res) => {
            const id =req.params.id
            const query = {_id: ObjectId(id)}
            const result =await manageorderCollection.findOne(query)
            res.send(result)
        }) */


        // GET SPECIFIC ID PRODUCT
        app.get('/product/:id', async(req, res) => {
            const id =req.params.id
            const query = {_id: ObjectId(id)}
            const result =await productCollection.findOne(query)
            res.send(result)
        }) 

    }
    finally{

    }
}
 
run().catch(console.dir)



app.get('/', (req, res) => {
  res.send('Hello From Kelong Group!')
})

app.listen(port, () => {
  console.log(`Kelong app listening on port ${port}`)
})