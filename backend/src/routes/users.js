const express = require("express");
const User = require("../models/User");
const router = express.Router();

router.post("/", async (req, res) => {
  const { name, email, phone, password, points } = req.body;

  // password hash 
  const bcrypt = require("bcryptjs");
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


module.exports = router;