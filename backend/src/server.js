require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const userRoutes = require("./routes/users");
app.use("/api/users", userRoutes);

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("connected to mongoDB");

    const port = process.env.PORT || 4000;
    app.listen(port, () => {
      console.log(`server is running on port ${port}`);
    });
  } catch (err) {
    console.error("mongo connection error", err);
    process.exit(1);
  }
}

start();