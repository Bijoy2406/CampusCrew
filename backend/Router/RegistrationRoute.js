const express = require('express')
const router = express.Router()

const Registration = require('../models/RegistrationModel')


router.post('/register-event', async (req, res) => {
    try {
        const registrationData = req.body;
        const newRegistration = new Registration(registrationData);
        await newRegistration.save();
        res.status(201).json({ success: true, registration: newRegistration });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})

router.get('/registrations', async (req, res) => {
    try {
        const registrations = await Registration.find();
        res.status(200).json({ success: true, registrations });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})







module.exports = router





