const express = require('express')
const router = express.Router()
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const Users = require('../models/UserModel')
const cloudinary = require('../utils/cloudinary')
const upload = require('../utils/multer')



// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1] || req.headers['accesstoken'];

    if (!token) {
        return res.status(401).json({ success: false, message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, 'secret_ecom');
        req.user = decoded.user;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid token" });
    }
};




router.post('/login', async (req, res) => {
    try {
        let user = await Users.findOne({ email: req.body.email });
        if (!user) {
            return res.json({ success: false, errors: "Wrong email" });
        }

        // Verification Check 
        if (!user.isVerified) {
            return res.status(401).json({ success: false, errors: "Please verify your email before logging in." });
        }

        const passCompare = await bcrypt.compare(req.body.password, user.password);
        if (!passCompare) {
            return res.json({ success: false, errors: "Wrong Password" });
        }

        if (user.isAdmin && !user.isApprovedAdmin) {
            return res.json({ success: false, errors: "You are not approved as an admin yet." });
        }

        const data = {
            user: {
                id: user.id,
                isAdmin: user.isAdmin,
                isApprovedAdmin: user.isApprovedAdmin,
            }
        };

        // If login is successful and user is verified, clear the verification token
        if (passCompare && user.isVerified) {
            user.verificationToken = undefined;
            await user.save();
        }

        // Check the refresh token and its expiry
        let refreshtoken = user.refreshToken;
        let refreshTokenExpiry = user.refreshTokenExpiry;
        const now = new Date();

        // If there's no refresh token or it's expired, create a new one
        if (!refreshtoken || refreshTokenExpiry <= now) {
            refreshtoken = jwt.sign(data, 'secret_recom', { expiresIn: "1d" });
            refreshTokenExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day

            await Users.findByIdAndUpdate(user.id, {
                refreshToken: refreshtoken,
                refreshTokenExpiry: refreshTokenExpiry
            });
        }

        // Generate new access token
        const token = jwt.sign(data, 'secret_ecom', { expiresIn: "30m" });

        // Return user data (excluding sensitive information)
        const userData = {
            id: user._id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin,
            isVerified: user.isVerified,
            isApprovedAdmin: user.isApprovedAdmin
        };

        res.json({ success: true, token, refreshtoken, user: userData });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error logging in" });
    }
});

router.post('/signup', async (req, res) => {
    let checkEmail = await Users.findOne({ email: req.body.email });
    if (checkEmail) {
        return res.status(400).json({ success: false, errors: "Existing user found with same email" });
    }

    let checkUsername = await Users.findOne({ name: req.body.username });
    if (checkUsername) {
        return res.status(400).json({ success: false, errors: "Existing user found with same username" });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);


    const user = new Users({
        username: req.body.username,
        email: req.body.email,
        password: hashedPassword,
        dob: req.body.dob,
        location: req.body.location,
        isAdmin: req.body.isAdmin || false,
    });

    await user.save();

    const data = {
        user: {
            id: user.id
        }
    };

    const token = jwt.sign(data, 'secret_ecom', { expiresIn: "30m" });

    res.json({ success: true, token });
});

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
    try {
        console.log('Profile request for user ID:', req.user.id);
        const user = await Users.findById(req.user.id).select('-password -refreshToken -refreshTokenExpiry');

        if (!user) {
            console.log('User not found with ID:', req.user.id);
            return res.status(404).json({ success: false, message: "User not found" });
        }

        console.log('User found:', { id: user._id, username: user.username, email: user.email });
        res.json({ success: true, user });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ success: false, message: "Error fetching profile" });
    }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { username, email, location, dob, targetScore } = req.body;

        // Check if email is being changed and if it already exists
        if (email && email !== req.user.email) {
            const emailExists = await Users.findOne({ email, _id: { $ne: req.user.id } });
            if (emailExists) {
                return res.status(400).json({ success: false, message: "Email already exists" });
            }
        }

        const updatedUser = await Users.findByIdAndUpdate(
            req.user.id,
            {
                $set: {
                    username,
                    email,
                    location,
                    dob: dob ? new Date(dob) : undefined,
                    targetScore
                }
            },
            { new: true, select: '-password -refreshToken -refreshTokenExpiry' }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, message: "Error updating profile" });
    }
});


router.post('/upload-photo', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Upload using the path from multer
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'profile_photos',
            resource_type: 'image'
        });

        res.status(200).json({ success: true, url: result.secure_url });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, message: 'Error uploading photo' });
    }
});



module.exports = router


