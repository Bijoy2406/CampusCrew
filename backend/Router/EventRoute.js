const express = require('express')
const router = express.Router()

const Events = require('../models/EventModel')
const upload = require('../utils/multer')
const cloudinary = require('../utils/cloudinary')

router.post('/events', upload.single('image'), async (req, res) => {

    const eventBody = req.body
    try {
        const newEvent = new Events(eventBody);
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'event_photos',
                resource_type: 'image'
            });
            newEvent.event_image = result.secure_url;
        }
        await newEvent.save();
        res.status(201).json({ success: true, event: newEvent });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})

router.get('/events', async (req, res) => {
    try {
        const events = await Events.find();
        res.status(200).json({ success: true, events });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})

router.put('/events/:id', upload.single('image'), async (req, res) => {
    try {
        const eventId = req.params.id;
        const eventBody = req.body;

        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'event_photos',
                resource_type: 'image'
            });
            eventBody.event_image = result.secure_url;
        }
        const oldEvent = await Events.findById(eventId);
        if (!oldEvent) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        oldEvent.title = eventBody.title || oldEvent.title;
        oldEvent.description = eventBody.description || oldEvent.description;
        oldEvent.date = eventBody.date || oldEvent.date;
        oldEvent.location = eventBody.location || oldEvent.location;
        oldEvent.registration_deadline = eventBody.registration_deadline || oldEvent.registration_deadline;
        oldEvent.registration_fee = eventBody.registration_fee || oldEvent.registration_fee;
        if (eventBody.event_image) oldEvent.event_image = eventBody.event_image;

        const updatedEvent = await oldEvent.save();
        res.status(200).json({ success: true, event: updatedEvent });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})


router.delete("/events/:id", async (req, res) => {
    try {
        const eventId = req.params.id;
        const deletedEvent = await Events.findByIdAndDelete(eventId);
        if (!deletedEvent) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        res.status(200).json({ success: true, message: 'Event deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
})


module.exports = router





