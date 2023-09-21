const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const bcrypt = require('bcrypt');
const ipinfo = require('ipinfo'); 
const ObjectId = mongoose.Types.ObjectId;

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 5050;
const MONGODB_URI = 'mongodb+srv://ravinder22:ravinder123@ravindernyalakati08.ovdjwp3.mongodb.net/?retryWrites=true&w=majority';

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  
  
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}/`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });



// Define a User schema and model
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  phoneNumber: String,
  otp: String,
});

const User = mongoose.model('User', userSchema);

// Twilio Configuration (replace with your Twilio credentials)
const TWILIO_ACCOUNT_SID = "AC1e69667ee81c986bf0bcfb793ff2fa97";
const TWILIO_AUTH_TOKEN = "97031f076a4a8efd57e5736f5cd9e84e"; 
const TWILIO_PHONE_NUMBER = "+18173396830"
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Generate a random OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP to User's Phone Number
function sendOTP(phoneNumber, otp) {
  return twilioClient.messages.create({
    body: `Your OTP is: ${otp}`,
    from: TWILIO_PHONE_NUMBER,
    to: phoneNumber,
  });
}

app.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//register the new user using the mobile otp...
app.post('/register', async (req, res) => {
    try {
      // Validate the user's IP address using the ipinfo module
      const ip = req.ip;
      const ipDetails = await ipinfo(ip);
  
      // Generate and store a random OTP
      const otp = generateOTP();
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
  
      // Create a new user document and save it to the database
      const newUser = new User({
        username: req.body.username,
        password: hashedPassword,
        phoneNumber: req.body.phoneNumber, // Allow any valid phone number format.
        otp: otp,
      });
  
      await newUser.save();
  
      // Send OTP to the user's phone number (ensure it's correctly formatted)
      await sendOTP(req.body.phoneNumber, otp); // Pass the full international phone number.
  
      res.status(200).json({ message: 'Registration successful. OTP sent to your phone.' });
    } catch (error) {
      console.error('Error during registration:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  });
  

app.delete('/', async (req, res) => {
  
    try {
      //const result = await db.collection('users').deleteOne({ _id: new ObjectId("64ac16820f256825d3978202")});
  
      const result = await User.deleteMany({ });
  
      if (result.deletedCount > 0) {
        res.send('Data deleted successfully').status(200);
      } else {
        res.send('Data not found').status(404);
      }
    } catch (error) {
      console.log(error);
      res.send('Error occurred while deleting data').status(500);
    }
  });

//validate the otp 
app.post('/validateOTP', async (req, res) => {
  try {
    const { phoneNumber, enteredOTP } = req.body;
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.otp === enteredOTP) {
      return res.status(200).json({ message: 'OTP is valid. User registered successfully.' });
    } else {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
  } catch (error) {
    console.error('Error during OTP validation:', error);
    res.status(500).json({ error: 'OTP validation failed' });
  }
});
