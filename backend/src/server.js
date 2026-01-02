
// Load dotenv only in local development
if (process.env.RAILWAY_ENVIRONMENT !== "production") {
  require("dotenv").config();
}

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

const userRoutes = require("./routes/users");
app.use("/api/users", userRoutes);

async function start() {
  try {
    // Check if MONGODB_URI exists
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined. Set it in Railway Shared Variables or in .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("connected to mongoDB");

    const port = process.env.PORT || 4000;
    app.listen(port, "0.0.0.0", () => console.log(`Server running on port ${port}`));

  } catch (err) {
    console.error("mongo connection error", err);
    process.exit(1);
  }
}

start();
























// require("dotenv").config();
// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");
// const cookieParser = require("cookie-parser");

// const app = express();
// app.use(cors({
//   origin: "http://localhost:3000",
//   credentials: true,
// }));

// app.use(express.json());
// app.use(cookieParser());

// const userRoutes = require("./routes/users");
// app.use("/api/users", userRoutes);

// async function start() {
//   try {
//     await mongoose.connect(process.env.MONGODB_URI);
//     console.log("connected to mongoDB");

//     const port = process.env.PORT || 4000;
//     app.listen(port, () => {
//       console.log(`server is running on port ${port}`);
//     });
//   } catch (err) {
//     console.error("mongo connection error", err);
//     process.exit(1);
//   }
// }

// start();