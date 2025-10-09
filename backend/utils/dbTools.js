/**
 * Database Tools
 * Helper functions to query MongoDB for live event data
 */

const EventModel = require('../models/EventModel');
const RegistrationModel = require('../models/RegistrationModel');

/**
 * Get event details by name or ID
 */
async function getEventDetails(eventIdentifier) {
  try {
    let event;
    
    // Try to find by ID first
    if (eventIdentifier.match(/^[0-9a-fA-F]{24}$/)) {
      event = await EventModel.findById(eventIdentifier);
    } else {
      // Search by name (case-insensitive)
      event = await EventModel.findOne({
        title: new RegExp(eventIdentifier, 'i')
      });
    }
    
    if (!event) {
      return null;
    }
    
    return {
      id: event._id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: null, // Not available in current schema
      location: event.location,
      category: event.category || 'General',
      organizer: event.organizer,
      maxParticipants: 100, // Default since not in schema
      isPaid: event.registration_fee > 0,
      price: event.registration_fee,
      prizeMoney: event.prize_money,
      registrationDeadline: event.registration_deadline,
      status: 'active', // Default status since not in schema
      createdAt: event.createdAt
    };
  } catch (error) {
    console.error('Error getting event details:', error);
    return null;
  }
}

/**
 * Get participant count for an event
 */
async function getParticipantCount(eventIdentifier) {
  try {
    const event = await getEventDetails(eventIdentifier);
    
    if (!event) {
      return null;
    }
    
    // Count registrations with status 'confirmed' or 'attended'
    const count = await RegistrationModel.countDocuments({
      eventId: event.id,
      status: { $in: ['confirmed', 'attended'] }
    });
    
    return {
      eventTitle: event.title,
      participantCount: count,
      maxParticipants: event.maxParticipants,
      spotsRemaining: event.maxParticipants - count,
      isFull: count >= event.maxParticipants
    };
  } catch (error) {
    console.error('Error getting participant count:', error);
    return null;
  }
}

/**
 * Get last registration date for an event
 */
async function getLastDate(eventIdentifier) {
  try {
    const event = await getEventDetails(eventIdentifier);
    
    if (!event) {
      return null;
    }
    
    // Get the most recent registration
    const lastRegistration = await RegistrationModel
      .findOne({ eventId: event.id })
      .sort({ createdAt: -1 })
      .limit(1);
    
    return {
      eventTitle: event.title,
      eventDate: event.date,
      lastRegistrationDate: lastRegistration ? lastRegistration.createdAt : null,
      hasRegistrations: !!lastRegistration
    };
  } catch (error) {
    console.error('Error getting last registration date:', error);
    return null;
  }
}

/**
 * Get upcoming events
 */
async function getUpcomingEvents(limit = 5) {
  try {
    const now = new Date();
    
    const events = await EventModel
      .find({
        date: { $gte: now }
      })
      .sort({ date: 1 })
      .limit(limit)
  .select('title date location category organizer registration_deadline prize_money registration_fee');
    
    // Get participant counts for each event
    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        const count = await RegistrationModel.countDocuments({
          eventId: event._id,
          status: { $in: ['confirmed', 'attended'] }
        });
        
        // Use a reasonable default max participants since it's not in schema
        const maxParticipants = 100; // Default limit
        
        return {
          id: event._id,
          title: event.title,
          date: event.date,
          time: null, // Not available in current schema
          location: event.location,
          category: event.category || 'General',
          organizer: event.organizer,
          registrationDeadline: event.registration_deadline,
          prizeMoney: event.prize_money,
          price: event.registration_fee,
          participants: count,
          maxParticipants: maxParticipants,
          spotsRemaining: maxParticipants - count
        };
      })
    );
    
    return eventsWithCounts;
  } catch (error) {
    console.error('Error getting upcoming events:', error);
    return [];
  }
}

/**
 * Search events by keyword
 */
async function searchEvents(keyword) {
  try {
    const events = await EventModel.find({
      $or: [
        { title: new RegExp(keyword, 'i') },
        { description: new RegExp(keyword, 'i') },
        { category: new RegExp(keyword, 'i') }
      ]
    })
      .limit(10)
      .select('title date category location registration_fee prize_money');
    
    return events.map(event => ({
      id: event._id,
      title: event.title,
      date: event.date,
      category: event.category,
      location: event.location,
      price: event.registration_fee,
      prizeMoney: event.prize_money
    }));
  } catch (error) {
    console.error('Error searching events:', error);
    return [];
  }
}

/**
 * Get events by category
 */
async function getEventsByCategory(category, limit = 10) {
  try {
    const now = new Date();
    
    const events = await EventModel
      .find({
        category: new RegExp(category, 'i')
      })
      .sort({ date: 1 })
      .limit(limit)
  .select('title date location category organizer registration_deadline prize_money registration_fee');
    
    // Get participant counts for each event
    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        const count = await RegistrationModel.countDocuments({
          eventId: event._id,
          status: { $in: ['confirmed', 'attended'] }
        });
        
        const maxParticipants = 100; // Default limit
        const isUpcoming = event.date >= now;
        
        return {
          id: event._id,
          title: event.title,
          date: event.date,
          location: event.location,
          category: event.category || 'General',
          organizer: event.organizer,
          registrationDeadline: event.registration_deadline,
          prizeMoney: event.prize_money,
          price: event.registration_fee,
          participants: count,
          maxParticipants: maxParticipants,
          spotsRemaining: maxParticipants - count,
          isUpcoming: isUpcoming,
          status: isUpcoming ? 'upcoming' : 'past'
        };
      })
    );
    
    return eventsWithCounts;
  } catch (error) {
    console.error('Error getting events by category:', error);
    return [];
  }
}

/**
 * Get event statistics
 */
async function getEventStats() {
  try {
    const totalEvents = await EventModel.countDocuments({});
    const totalRegistrations = await RegistrationModel.countDocuments();
    
    const now = new Date();
    const upcomingEvents = await EventModel.countDocuments({
      date: { $gte: now }
    });
    
    const pastEvents = await EventModel.countDocuments({
      date: { $lt: now }
    });
    
    return {
      totalEvents,
      upcomingEvents,
      pastEvents,
      totalRegistrations
    };
  } catch (error) {
    console.error('Error getting event stats:', error);
    return null;
  }
}

/**
 * Extract category from query
 */
function extractCategory(query) {
  // Known categories for exact matching
  const knownCategories = [
    'Cultural', 'Arts & Creativity', 'Arts', 'Career & Professional Development', 
    'Career', 'Environment', 'Literary', 'Speaking', 'Seminar'
  ];
  
  // Check for direct category mentions first
  for (const category of knownCategories) {
    if (new RegExp(category, 'i').test(query)) {
      return category;
    }
  }
  
  // Pattern matching for category structure
  const categoryPatterns = [
    /(?:in|from|of)\s+(?:the\s+)?([a-zA-Z\s&]+?)\s+category/i,
    /([a-zA-Z\s&]+?)\s+category/i,
    /(?:show\s+me\s+)([a-zA-Z\s&]+?)\s+events/i,
    /(?:events?\s+(?:in|for|of)\s+([a-zA-Z\s&]+?)(?:\s|$|\?|!))/i
  ];
  
  for (const pattern of categoryPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const category = match[1].trim();
      // Skip common words that aren't categories
      const skipWords = ['any', 'the', 'some', 'all', 'there', 'event', 'events', 'what about'];
      const skipPattern = new RegExp(`^(${skipWords.join('|')})`, 'i');
      
      if (!skipPattern.test(category) && category.length > 2) {
        return category;
      }
    }
  }
  
  return null;
}

/**
 * Detect if query requires database access
 */
function requiresDatabaseQuery(query) {
  const dbKeywords = [
    'participant', 'participants', 'attendee', 'attendees',
    'registration', 'registered', 'sign up', 'signup',
    'count', 'how many', 'number of',
    'last date', 'deadline', 'last registration',
  // fee / price / prize related
  'fee', 'registration fee', 'cost', 'price', 'entry fee', 'ticket', 'free', 'free event', 'free entry', 'no fee',
    'prize', 'prize money', 'reward', 'winnings',
    'upcoming event', 'next event', 'coming event',
    'event detail', 'event info', 'tell me about',
    'available', 'spots', 'seats', 'capacity',
    'full', 'sold out', 'remaining',
    'category', 'cultural', 'arts', 'career', 'environment',
    'literary', 'seminar', 'any event', 'events in',
    'stat', 'statistics', 'platform stat', 'event stat',
    'total event', 'total registration'
  ];
  
  const lowerQuery = query.toLowerCase();
  return dbKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Extract event name from query
 */
function extractEventName(query) {
  // Common patterns for event names in queries
  const patterns = [
    /(?:event\s+(?:called|named)?["']?([^"'?.!]+)["']?)/i,
    /(?:["']([^"']+)["']\s+event)/i,
    /(?:about|for)\s+["']?([^"'?.!]+)["']?\s+event/i,
    /(?:participants?\s+(?:in|for|of)\s+["']?([^"'?.!]+)["']?)/i,
    // Fee/price/prize oriented queries like: "fee for X", "prize money for X", "how much is the ticket for X"
    /(?:what(?:'s| is)?\s*(?:the\s*)?(?:fee|price|cost|entry\s*fee|ticket|prize(?:\s*money)?))\s*(?:for|of|in)\s+["']?([^"'?.!]+)["']?/i,
    /(?:(?:fee|price|cost|entry\s*fee|ticket|prize(?:\s*money)?)\s*(?:for|of|in)\s+["']?([^"'?.!]+)["']?)/i,
    /(?:how\s+much[^?\n]*?(?:fee|price|ticket)[^?\n]*?(?:for|of|in)\s+["']?([^"'?.!]+)["']?)/i
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

module.exports = {
  getEventDetails,
  getParticipantCount,
  getLastDate,
  getUpcomingEvents,
  getEventsByCategory,
  searchEvents,
  getEventStats,
  requiresDatabaseQuery,
  extractEventName,
  extractCategory
};
