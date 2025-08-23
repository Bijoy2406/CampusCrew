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


router.get('/registrations/user/:id', async (req, res) => {
    try {
        const id = req.params.id
        const registration = await Registration.find({ userId: id }).populate('eventId')
        if (!registration || registration.length === 0) {
            return res.status(404).json({ success: false, message: 'Registered events not found', userId: id });
        }
        res.status(200).json({ success: true, registration })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})

router.get('/registrations/event/:id', async (req, res) => {
    try {
        const id = req.params.id
        const registration = await Registration.find({ eventId: id }).populate('userId')
        if (!registration || registration.length === 0) {
            return res.status(404).json({ success: false, message: 'Registered users not found', eventId: id });
        }
        res.status(200).json({ success: true, registration })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})


router.delete('/registrations/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.body.userId;

        const deletion = await Registration.findById(id)
        if (deletion.userId.toString() !== userId) {
            return res.status(404).json({ success: false, message: "User is not authorized." })
        }
        const deletionResult = await Registration.findByIdAndDelete(id)
        if (!deletionResult) {
            return res.status(404).json({ success: false, message: "Registration not found" })
        }
        res.status(200).json({ success: true, message: "Registration deleted Successfully" })

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})



module.exports = router





