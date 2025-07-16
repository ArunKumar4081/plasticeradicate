const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config(); // Load .env file

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// MongoDB connection using Atlas URI from environment
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("Connected to MongoDB Atlas"))
  .catch(err => console.error("MongoDB Error:", err));

// Mongoose Models
const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  email: String,
  password: String,
}));

const Organization = mongoose.model('Organization', new mongoose.Schema({
  name: String,
  email: String,
}));

const Report = mongoose.model('Report', new mongoose.Schema({
  latitude: Number,
  longitude: Number,
  image: String,
  createdAt: { type: Date, default: Date.now }
}));

// Email transporter (optional: use Gmail or a service like Mailgun/SendGrid)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER, // your gmail
    pass: process.env.MAIL_PASS  // app password from Google
  }
});

// Register route
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: 'Missing fields' });

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(409).json({ message: 'User already exists' });

    await new User({ name, email, password }).save();

    const existingOrg = await Organization.findOne({ email });
    if (!existingOrg) {
      await new Organization({ name, email }).save();
    }

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Missing credentials' });

  try {
    const user = await User.findOne({ email, password });
    if (!user)
      return res.status(401).json({ message: 'Invalid credentials' });

    res.status(200).json({ message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ message: 'Login error' });
  }
});

// Report route
app.post('/report', async (req, res) => {
  const { latitude, longitude, image } = req.body;

  if (!latitude || !longitude || !image)
    return res.status(400).json({ message: 'Missing fields' });

  try {
    const newReport = new Report({ latitude, longitude, image });
    await newReport.save();

    const orgs = await Organization.find();
    const emailText = `Plastic Waste Report:\nLatitude: ${latitude}\nLongitude: ${longitude}`;

    for (const org of orgs) {
      await transporter.sendMail({
        from: process.env.MAIL_USER,
        to: org.email,
        subject: 'New Plastic Waste Report',
        text: emailText,
      });
    }

    res.status(200).json({ message: 'Report sent successfully' });
  } catch (error) {
    console.error('Error sending report:', error);
    res.status(500).json({ message: 'Server error while sending report' });
  }
});

// Default route
app.get('/', (req, res) => {
  res.send('Plastic Waste Reporter API is running');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
