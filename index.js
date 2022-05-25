const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

//

// function verifyJWT(req, res, next) {
//   const authHeader = req.headers.authorization;
//   if (!authHeader) {
//     return res.status(401).send({ message: "Unauthorized Access" });
//   }
//   const token = authHeader.split(" ")[1];
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
//     if (err) {
//       res.status(403).send({ message: "Forbidden Access" });
//     }
//     req.decoded = decoded;
//     next();
//   });
// }

//

async function run() {
  await client.connect();
  console.log("DB Connected");

  const orderCollection = client.db("manufacturer_portal").collection("orders");

  const productCollection = client
    .db("manufacturer_portal")
    .collection("products");

  const reviewCollection = client
    .db("manufacturer_portal")
    .collection("reviews");

  const userCollection = client.db("manufacturer_portal").collection("users");

  //

  //

  //

  //

  //

  //
  // Get single user information - My profile
  app.get("/user", async (req, res) => {
    const email = req.query.email;
    const query = { email: email };
    const user = await userCollection.find(query).toArray();
    res.send(user);
  });

  //

  //

  //

  // Get all user information - Make Admin Page
  app.get("/admin", async (req, res) => {
    const users = await userCollection.find().toArray();
    res.send(users);
  });

  // update user role as admin --
  app.put("/user/admin/:email", async (req, res) => {
    const email = req.params.email;
    const filter = { email: email };
    const updatedDoc = {
      $set: { role: "admin" },
    };
    const result = await userCollection.updateOne(filter, updatedDoc);
    console.log(email, result);
    res.send(result);
  });

  // POST new user - getting data from usetoken --
  app.put("/user/:email", async (req, res) => {
    const email = req.params.email;
    const user = req.body;
    const filter = { email: email };
    const options = { upsert: true };
    const updatedDoc = {
      $set: user,
    };

    const result = await userCollection.updateOne(filter, updatedDoc, options);
    const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "10h",
    });
    res.send({ result, token });
  });

  // delete single order - My Order page & manage orders page --
  app.delete("/order/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const result = orderCollection.deleteOne(query);
    res.send(result);
  });

  // POST new product - Add a Product --
  app.post("/products", async (req, res) => {
    const product = req.body;
    const result = await productCollection.insertOne(product);
    res.send(result);
  });

  // delete single product - Manage Product page --
  app.delete("/products/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const result = productCollection.deleteOne(query);
    res.send(result);
  });

  // Get single user purchase order - My Orders --
  app.get("/order", async (req, res) => {
    const userEmail = req.query.email;
    const query = { userEmail: userEmail };
    const userOrders = await orderCollection.find(query).toArray();
    res.send(userOrders);
  });

  // Get single product data - Purchase Page Data Load --
  app.get("/purchase/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
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
  app.get("/allOrders", async (req, res) => {
    const query = {};
    const allOrders = await orderCollection.find(query).toArray();
    res.send(allOrders);
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
