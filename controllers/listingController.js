import Listing from '../models/Listing.js';

// @desc    Get all active listings (with search & category filter)
// @route   GET /api/listings
// @access  Public
export const getListings = async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = { isActive: true };

    // Apply category filter if provided
    if (category) {
      query.category = category;
    }

    // Apply text search filter on title or location
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
      ];
    }

    const listings = await Listing.find(query)
      .populate('hostId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single listing details
// @route   GET /api/listings/:id
// @access  Public
export const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate('hostId', 'name email');

    if (!listing) {
      return res.status(404).json({ message: 'Workspace listing not found' });
    }

    res.status(200).json(listing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new listing
// @route   POST /api/listings
// @access  Private (Host or Admin only)
export const createListing = async (req, res) => {
  try {
    const { title, description, category, hourlyRate, location, amenities, images } = req.body;

    if (!title?.trim() || !description?.trim() || !category || !hourlyRate) {
      return res.status(400).json({
        message: 'Title, description, category, and hourly rate are required',
      });
    }

    const numericRate = Number(hourlyRate);
    if (Number.isNaN(numericRate) || numericRate < 0) {
      return res.status(400).json({ message: 'Hourly rate must be a valid positive number' });
    }

    const normalizedLocation =
      location && typeof location === 'object'
        ? {
            address: location.address?.trim() || 'Nairobi',
            city: location.city?.trim() || 'Nairobi',
          }
        : { address: 'Nairobi', city: 'Nairobi' };

    const normalizedAmenities = Array.isArray(amenities)
      ? amenities.map((item) => String(item).trim()).filter(Boolean)
      : typeof amenities === 'string'
        ? amenities
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : [];

    const listing = await Listing.create({
      hostId: req.user.id,
      title: title.trim(),
      description: description.trim(),
      category,
      hourlyRate: numericRate,
      location: normalizedLocation,
      amenities: normalizedAmenities,
      images: Array.isArray(images) ? images.filter(Boolean) : [],
    });

    res.status(201).json({ success: true, listing });
  } catch (error) {
    const message = error?.message || 'Failed to create workspace listing';
    if (error?.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(error.errors)[0]?.message || message });
    }

    res.status(500).json({ message });
  }
};

// @desc    Update listing
// @route   PUT /api/listings/:id
// @access  Private (Host owner or Admin)
export const updateListing = async (req, res) => {
  try {
    let listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Ensure user is the host who created the listing OR an admin
    if (listing.hostId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this listing' });
    }

    listing = await Listing.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, listing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete listing
// @route   DELETE /api/listings/:id
// @access  Private (Host owner or Admin)
export const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Ensure authorization
    if (listing.hostId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this listing' });
    }

    await listing.deleteOne();

    res.status(200).json({ success: true, message: 'Listing removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};