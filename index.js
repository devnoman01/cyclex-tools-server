const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectID } = require("mongodb");
const { query } = require("express");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rsh38.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  await client.connect();
  console.log("DB Connected");

  const productCollection = client
    .db("manufacturer_portal")
    .collection("products");

  const orderCollection = client.db("manufacturer_portal").collection("orders");

  const reviewCollection = client
    .db("manufacturer_portal")
    .collection("reviews");

  //

  //

  //

  // Get single user purchase order - My Order
  app.get("/order", async (req, res) => {
    const userEmail = req.query.email;
    const query = { userEmail: userEmail };
    const userOrders = await orderCollection.find(query).toArray();
    console.log(userOrders);
    res.send(userOrders);
  });

  // Get single product data - Purchase Page Data Load --
  app.get("/purchase/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectID(id) };
    const productInfo = await productCollection.findOne(query);
    res.send(productInfo);
  });

  // GET latest products - Home Page 6 product --
  app.get("/latestProducts", async (req, res) => {
    const products = await (
      await productCollection.find().toArray()
    ).slice(0, 6);
    res.send(products);
  });

  // Get all purchase order - Manage All Order --
  app.get("/order", async (req, res) => {
    const userOrders = await orderCollection.find().toArray();
    res.send(userOrders);
  });

  // GET all products - Manage Products --
  app.get("/products", async (req, res) => {
    const products = await productCollection.find().toArray();
    res.send(products);
  });

  // POST new purchase order - Purchase/New Order --
  app.post("/order", async (req, res) => {
    const order = req.body;
    const result = await orderCollection.insertOne(order);
    res.send(result);
  });

  // GET all review - home review section --
  app.get("/review", async (req, res) => {
    const reviews = await reviewCollection.find().toArray();
    res.send(reviews);
  });

  // POST new review - Add a Review --
  app.post("/review", async (req, res) => {
    const review = req.body;
    const result = await reviewCollection.insertOne(review);
    res.send(result);
  });

  //
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Manufacturer Portal Server Running");
});

app.listen(port, () => {
  console.log(`Portal Server Running on port ${port}`);
});
