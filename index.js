const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { query } = require("express");
require("dotenv").config();
const port = process.env.PORT || 5000;

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rsh38.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
}

//

async function run() {
  try {
    await client.connect();
    console.log("DB Connected");

    const orderCollection = client
      .db("manufacturer_portal")
      .collection("orders");

    const productCollection = client
      .db("manufacturer_portal")
      .collection("products");

    const reviewCollection = client
      .db("manufacturer_portal")
      .collection("reviews");

    const userCollection = client.db("manufacturer_portal").collection("users");
    const paymentCollection = client
      .db("manufacturer_portal")
      .collection("payments");

    //

    // verify admin user
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });

      if (requesterAccount.role === "admin") {
        next();
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    };

    // // payment processing - send data to stripe
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // payment status update
    app.patch("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          isPaid: true,
          transactionId: payment.transactionId,
        },
      };
      const result = await paymentCollection.insertOne(payment);
      const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
      res.send(updatedOrder);
    });

    // // quantity update
    // app.patch("/order/:id", verifyJWT, async (req, res) => {
    //   const id = req.params.id;

    //   const filter = { _id: ObjectId(id) };
    //   const updatedDoc = {
    //     $set: {
    //       isPaid: true,
    //       transactionId: payment.transactionId,
    //     },
    //   };
    //   const result = await paymentCollection.insertOne(payment);
    //   const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
    //   res.send(updatedOrder);
    // });

    // shipment
    app.patch("/shipOrder/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          isShipped: true,
        },
      };
      const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
      res.send(updatedOrder);
    });

    //-------------------------------------------
    // payment processing
    app.get("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await orderCollection.findOne(query);
      res.send(order);
    });

    //

    // update user information - My Profile page --
    app.patch("/user/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;

      const user = req.body;

      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          address: user.address,
          education: user.education,
          img: user.img,
          linkedin: user.linkedin,
          name: user.name,
          number: user.number,
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // verifying user as admin - useAdmin hook --
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    // Get single user information - My profile --
    app.get("/user", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await userCollection.find(query).toArray();
      res.send(user);
    });

    // Get all user information - Make Admin Page --
    app.get("/admin", verifyJWT, verifyAdmin, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    // update user role as admin -- make admin page
    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updatedDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
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

      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: "7d",
        }
      );
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
    app.post("/products", verifyJWT, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });

    // delete single product - Manage Product page --
    app.delete("/products/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = productCollection.deleteOne(query);
      res.send(result);
    });

    // Get single user purchase order - My Orders --
    app.get("/order", verifyJWT, async (req, res) => {
      const userEmail = req.query.email;
      const decodedEmail = req.decoded.email;
      if (userEmail === decodedEmail) {
        const query = { userEmail: userEmail };
        const userOrders = await orderCollection.find(query).toArray();
        return res.send(userOrders);
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    });

    // Get single product data - Purchase Page Data Load --
    app.get("/purchase/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const productInfo = await productCollection.findOne(query);
      res.send(productInfo);
    });

    // GET all products - Products page --
    app.get("/allProducts", async (req, res) => {
      const products = await productCollection.find().toArray();
      res.send(products);
    });

    // GET latest products - Home Page 6 product by reverse --
    app.get("/latestProducts", async (req, res) => {
      const products = await (
        await (await productCollection.find().toArray()).reverse()
      ).slice(0, 6);
      res.send(products);
    });

    // Get all purchase order - Manage All Order --
    app.get("/allOrders", verifyJWT, verifyAdmin, async (req, res) => {
      const query = {};
      const allOrders = await orderCollection.find(query).toArray();
      res.send(allOrders);
    });

    // GET all products - Manage Products --
    app.get("/products", verifyJWT, verifyAdmin, async (req, res) => {
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
    app.post("/review", verifyJWT, async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    //
  } finally {
    //
  }

  //
}

run().catch(console.dir);

//

app.get("/", (req, res) => {
  res.send("Manufacturer Portal Server Running");
});

app.listen(port, () => {
  console.log(`Portal Server Running on port ${port}`);
});
