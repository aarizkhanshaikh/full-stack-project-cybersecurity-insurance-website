const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Initialize Express app
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/cyberGuardDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Define schema for company data
const companySchema = new mongoose.Schema({
  companyName: String,
  contactEmail: String,
  industry: String,
  companySize: String,
  companyRevenue: Number,
  cyberInsurance: String,
  itTeam: String,
  framework: String,
  securitySoftware: String,
  riskLevel: Number,
  securityMeasures: String,
  incidentHistory: String
});

const Company = mongoose.model('Company', companySchema);

// Route to handle form submission
app.post('/submit-form', async (req, res) => {
  const formData = req.body;

  // Save form data to MongoDB
  const company = new Company(formData);
  await company.save();

  // Calculate score based on data (simple example)
  let score = 0;
  
  // Example scoring logic (you can modify this as per your criteria)
  if (formData.cyberInsurance === 'yes') score += 2;
  if (formData.itTeam === 'yes') score += 3;
  if (formData.riskLevel <= 3) score += 5;
  if (formData.securitySoftware) score += 1;

  // Send response back with the score
  res.send({
    message: "Form submitted successfully",
    score: score
  });
});

// Start server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
