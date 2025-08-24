const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')

const Events = require('../models/EventModel')
const Users = require('../models/UserModel')
const upload = require('../utils/multer')
const multer = require('multer')
const cloudinary = require('../utils/cloudinary')

// Middleware: verify JWT
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    try {
        const decoded = jwt.verify(token, 'secret_ecom');
        req.user = decoded.user; // { id, isAdmin, isApprovedAdmin }
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Middleware: ensure user is an approved admin
const requireAdmin = async (req, res, next) => {
    try {
        const user = await Users.findById(req.user.id).select('isAdmin isApprovedAdmin');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        if (!user.isAdmin) return res.status(403).json({ success: false, message: 'Admin access required' });
        if (user.isAdmin && !user.isApprovedAdmin) return res.status(403).json({ success: false, message: 'Admin not approved yet' });
        next();
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Authorization check failed' });
    }
};

// Create Event (Admin only)
router.post('/events', verifyToken, requireAdmin, (req,res,next)=>{
    upload.single('image')(req,res,function(err){
        if(err instanceof multer.MulterError && err.code==='LIMIT_FILE_SIZE') return res.status(413).json({success:false,message:'Image must be 3MB or smaller'});
        if(err) return res.status(400).json({success:false,message:err.message});
        next();
    })
}, async (req, res) => {
    try {
        const eventBody = req.body || {};
        // Always trust token, not client, for creator
        eventBody.createdBy = req.user.id;
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

// Get single event details
router.get('/events/:id', async (req, res) => {
    try {
        const event = await Events.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        res.status(200).json({ success: true, event });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})

// Update Event (Admin only for now) - could be extended to creator-only
router.put('/events/:id', verifyToken, requireAdmin, (req,res,next)=>{
    upload.single('image')(req,res,function(err){
        if(err instanceof multer.MulterError && err.code==='LIMIT_FILE_SIZE') return res.status(413).json({success:false,message:'Image must be 3MB or smaller'});
        if(err) return res.status(400).json({success:false,message:err.message});
        next();
    })
}, async (req, res) => {
    try {
        const eventId = req.params.id;
        const eventBody = req.body || {};
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
        // Apply updates
        const fields = ['title','description','date','location','organizer','registration_deadline','registration_fee','prize_money','event_type'];
        fields.forEach(f => { if (eventBody[f] !== undefined) oldEvent[f] = eventBody[f]; });
        if (eventBody.event_image) oldEvent.event_image = eventBody.event_image;
        const updatedEvent = await oldEvent.save();
        res.status(200).json({ success: true, event: updatedEvent });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})


// Delete Event (Admin only for now)
router.delete("/events/:id", verifyToken, requireAdmin, async (req, res) => {
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





