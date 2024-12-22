const express = require('express');
const path = require('path');
const mongoose = require('mongoose'); // Import mongoose
const bcrypt = require('bcryptjs'); // Import bcrypt for hashing passwords
const session = require('express-session'); // Import session for user sessions

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'src'))); // Serve static files (CSS, JS, images)

// Set view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Set views directory

// MongoDB connection setup
mongoose.connect('mongodb://localhost:27017/cyberGuardDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('MongoDB connected');
}).catch((err) => {
    console.log('Error connecting to MongoDB: ', err);
});

// Define schema and model for login form data
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// Define schema and model for form data
const formDataSchema = new mongoose.Schema({
    fname: { type: String, required: true },
    email: { type: String, required: true },
    industry: { type: String, required: true },
    size: { type: String, required: true },
    revenue: { type: Number, required: true },
    incidents: { type: String, required: true },
    scale: { type: String, required: true },
    insurance: { type: String, required: true },
});

const FormData = mongoose.model('FormData', formDataSchema);

// Middleware for session handling
app.use(session({
    secret: 'secret_key', // Use a secret key for signing cookies
    resave: false,
    saveUninitialized: true,
}));

// Serve the index.html as the landing page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'pages', 'login.html')); // Serve login page
});

// Handle login form submission (POST)
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email });
        const formData = await FormData.findOne({ email });

        // If user not found
        if (!user) {
            return res.send('<script>alert("Invalid email or password"); window.location.href="/login";</script>');
        }

        // Compare password with hashed password in DB
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.send('<script>alert("Invalid email or password"); window.location.href="/login";</script>');
        }

        // Set session data for the logged-in user
        req.session.userId = user._id;

        // Check if formData exists for this user
        if (formData) {
            let ins_premium = `$${(formData.revenue * 1000).toLocaleString()}`;
            return res.render('dashboard', {
                message: null,
                companyName: formData.fname,
                email: formData.email,
                insuranceType: formData.insurance,
                insurancePremium: ins_premium
            });
        } else {
            return res.render('dashboard', {
                message: 'No insurance information found',
                companyName: null,
                email: null,
                insuranceType: null,
                insurancePremium: null
            });
        }

    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Serve the register page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'pages', 'register.html')); // Serve register page
});

// Handle user registration (POST)
app.post('/register', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).render('register', { message: 'User already exists' });
        }

        // Hash the password before saving it
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user and save to database
        const newUser = new User({
            email,
            password: hashedPassword,
        });

        await newUser.save();
        console.log('User registered:', newUser);

        // Redirect to login page after successful registration
        res.redirect('/form');
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Route to show dashboard (example after login)
app.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login'); // Redirect to login if not logged in
    }
    res.render('dashboard'); // Serve dashboard view
});

// Serve the index.html as the landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html')); // Serve index page
});

// Serve form HTML for GET request
app.get('/form', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'pages', 'form.html')); // Serve form page
});

// Handle form submission
app.post('/form', async (req, res) => {
    const { fname, email, industry, size, revenue, incidents, scale, insurance } = req.body;

    // Save form data to MongoDB
    try {
        const formData = new FormData({
            fname,
            email,
            industry,
            size,
            revenue,
            incidents,
            scale,
            insurance,
        });

        await formData.save(); // Save the form data to MongoDB
        console.log('Form data saved:', formData);

        const income = revenue * 1000000; // Convert revenue to actual income

        // Consultation Only logic
        if (insurance === "Consultation Only") {
            res.render('consultation'); // Render consultation page
        } else {
            // Determine insurance type based on scale and insurance choice
            let template = '';
            if (scale === '1-3 (Low)') {
                if (insurance === "Software Only") template = 'software';
                else if (insurance === "Hardware Only") template = 'hardware';
                else if (insurance === "Software and Hardware") template = 'software_hardware';
            } else if (scale === '4-7 (Medium)') {
                if (insurance === "Software Only") template = 'software_medium';
                else if (insurance === "Hardware Only") template = 'hardware_medium';
                else if (insurance === "Software and Hardware") template = 'software_hardware_medium';
            } else if (scale === '8-10 (High)') {
                if (insurance === "Software Only") template = 'software_high';
                else if (insurance === "Hardware Only") template = 'hardware_high';
                else if (insurance === "Software and Hardware") template = 'software_hardware_high';
            }

            // Render the appropriate template or a default page if none matches
            if (template) {
                res.render(template, { income: income });
            } else {
                res.render('default'); // Default page
            }
        }
    } catch (err) {
        console.error('Error saving form data:', err);
        res.status(500).send('Error saving data');
    }
});

// Route to show recently entered data (only the latest entry)
app.get('/entered-data', async (req, res) => {
    try {
        // Fetch the most recent form data (sorted by _id in descending order)
        const recentData = await FormData.findOne().sort({ _id: -1 });

        // If no data found, render a message
        if (!recentData) {
            return res.render('enteredData', { message: 'No data available', formData: null });
        }

        // Render the 'enteredData' view with the most recent data
        res.render('enteredData', { formData: recentData, message: '' });
    } catch (err) {
        console.error('Error fetching recent form data:', err);
        res.status(500).send('Error fetching data');
    }
});

// Route to show form for editing data
app.get('/edit/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Fetch form data by ID from MongoDB
        const data = await FormData.findById(id);

        // If no data found, render an error message
        if (!data) {
            return res.render('enteredData', { message: 'Data not found' });
        }

        // Render the 'editForm' view with the specific data to pre-fill the form
        res.render('editForm', { formData: data });
    } catch (err) {
        console.error('Error fetching form data for editing:', err);
        res.status(500).send('Error fetching data for editing');
    }
});

// Route to handle form submission for updating data
app.post('/update/:id', async (req, res) => {
    const { id } = req.params;
    const { fname, email, industry, size, revenue, incidents, scale, insurance } = req.body;

    try {
        // Find the document by ID and update the data
        const updatedData = await FormData.findByIdAndUpdate(id, {
            fname,
            email,
            industry,
            size,
            revenue,
            incidents,
            scale,
            insurance,
        }, { new: true }); // `new: true` returns the updated document

        // Redirect to the entered-data page to see the changes
        res.redirect('/entered-data');
    } catch (err) {
        console.error('Error updating form data:', err);
        res.status(500).send('Error updating data');
    }
});

// Route to show dashboard (example after login)
app.get('/dashboard', async (req, res) => {
    // Check if user is logged in
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    try {
        const user = await User.findById(req.session.userId);
        const formData = await FormData.findOne({ email: user.email });

        if (formData) {
            let ins_premium = `$${(formData.revenue * 1000).toLocaleString()}`;
            res.render('dashboard', {
                message: null,
                companyName: formData.fname,
                email: formData.email,
                insuranceType: formData.insurance,
                insurancePremium: ins_premium
            });
        } else {
            res.render('dashboard', {
                message: 'No insurance information found',
                companyName: null,
                email: null,
                insuranceType: null,
                insurancePremium: null
            });
        }
    } catch (err) {
        console.error('Error loading dashboard:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Listen on the specified port
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
