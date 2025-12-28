const express = require("express");
const User = require("../models/User");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth")

router.post("/", async (req, res) => {
  // get data from frontend
  const { name, email, phone, password, points } = req.body;

  // password hash 
  const hashPassword = await bcrypt.hash(password, 10)

  try {
    console.log("Request body:", req.body);
    const user = await User.create({
      name,
      email,
      phone,
      password: hashPassword,
      points,
    });
    res.status(201).json(user);
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(400).json({ error: err.message });
  }
});



router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    // create jwt 
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    )

    // set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // true in production (https)
      sameSite: "lax",
      maxAge: 1 * 60 * 60 * 1000,
    })

    // send user data
    res.status(200).json({
      message: "Login Successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        points: user.points,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);

  } catch (error) {
    return res.status(500).json({ message: "server error" });
  }

});


router.post("/use-points", auth, async (req, res) => {
  const COST = 40; 

  const user = await User.findById(req.user.id);

  if (user.points < COST) {
    return res.status(400).json({ message: "Not enough points" });
  }

  user.points -= COST;   // 120 → 80
  await user.save();     //  SAVED TO DATABASE

  res.json({ points: user.points });
});


router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});


module.exports = router;