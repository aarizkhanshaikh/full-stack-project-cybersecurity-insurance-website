const mongoose = require('mongoose');

const FormDataSchema = new mongoose.Schema({
  companyName: String,
  contactEmail: String,
  industry: String,
  companySize: String,
  companyRevenue: String,
  cyberInsurance: String,
  itTeam: String,
  framework: String,
  securitySoftware: String,
  riskLevel: String,
  // Add additional fields as needed
});

module.exports = mongoose.model('FormData', FormDataSchema);