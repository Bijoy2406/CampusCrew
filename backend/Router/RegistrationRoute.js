const express = require('express')
const router = express.Router()

const Registration = require('../models/RegistrationModel')
const Events = require('../models/EventModel')
const { v4: uuidv4 } = require('uuid');
const SSLCommerzPayment = require('sslcommerz-lts');
const bkashAusth = require('../middleware/bkashAusth');
const store_id = process.env.Store_ID
const store_passwd = process.env.Store_Password
const axios = require('axios')
const global = require('node-global-storage')
const frontend = process.env.frontend_url
const backend = process.env.backend_url
router.post('/register-event', async (req, res) => {
    try {
        const tran_id = uuidv4();

        const registrationData = req.body;
        // Prevent duplicate registrations for same user & event
        const existing = await Registration.findOne({ userId: registrationData.userId, eventId: registrationData.eventId });
        if (existing) {
            return res.status(409).json({ success: false, message: 'Already registered for this event', registration: existing });
        }
        const event = await Events.findById(registrationData.eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }


        let newRegistration = new Registration({
            userId: registrationData.userId,
            eventId: registrationData.eventId,
        })
        if (event.registration_fee === 0) {

            newRegistration.is_registered = true;
            newRegistration.payment_status = 'completed';
        } else {
            newRegistration.is_registered = false;
            newRegistration.payment_status = 'pending';
            newRegistration.trans_id = tran_id;
        }
        await newRegistration.save();
        if (event.registration_fee === 0) {
            return res.status(201).json({ success: true, registration: newRegistration });
        }



    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})


router.post("/bkash/pay", bkashAusth.bkash_auth, async (req, res) => {
    try {
        const token = req.bkashToken; // token is attached to request
        // console.log("Using bKash Token:", token);

        const { data } = await axios.post(
            process.env.bkash_create_payment_url,
            {
                mode: "0011",
                payerReference: " ",
                callbackURL: `${backend}/api/bkash/callback?userId=` + req.body.userId + "&eventId=" + req.body.eventId,
                amount: req.body.amount.toString(),
                currency: "BDT",
                intent: "sale",
                merchantInvoiceNumber: "Inv" + uuidv4().substring(0, 8),
            },

            {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    authorization: token,
                    "x-app-key": process.env.bkash_api_key,
                },
            }
        );
        console.log(data)
        return res.status(200).json({ bkashURL: data.bkashURL });
    } catch (error) {
        return res.status(500).json({ success: false, message: error });
    }
});

router.get('/bkash/callback', bkashAusth.bkash_auth, async (req, res) => {
    const token = req.bkashToken;
    const { paymentID, status, userId, eventId } = req.query; // <-- include userId and eventId

    if (status === 'cancel' || status === 'failure') {
        return res.redirect(`${frontend}/failure?message=${status}`);
    } else if (status === 'success') {
        console.log('User ID:', userId);
        console.log('Event ID:', eventId);

        try {


            const existing = await Registration.findOne({ userId: userId, eventId: eventId });
            if (existing) {
                return res.redirect(`${frontend}/failure?message=Already registered for this event`);
            }

            let newRegistration = new Registration({
                userId: userId,
                eventId: eventId,
                payment_status: 'completed',
                is_registered: true
            })
            await newRegistration.save();
            return res.redirect(`${frontend}/events/${eventId}`);

        } catch (error) {
            console.error(error);
        }
    }
});

router.get('/event/:eventId/user/:userId', async (req, res) => {
    const { eventId, userId } = req.params;

    try {
        const registration = await Registration.findOne({ eventId, userId });
        if (!registration) {
            return res.status(404).json({ success: false, message: 'Registration not found' });
        }
        res.status(200).json({ success: true, registration });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

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



router.get('/success/:tran_id', async (req, res) => {
    try {
        const tran_id = req.params.tran_id;

        const register = await Registration.findOne({ trans_id: tran_id })
        if (!register) {
            return res.status(404).json({ success: false, message: 'Registration not found' });
        }
        register.payment_status = 'completed'
        register.is_registered = true
        await register.save()
        return res.redirect(`https://localhost:3000//events/${register.eventId}`);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})



module.exports = router





