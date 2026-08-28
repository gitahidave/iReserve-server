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

    const listing = await Listing.create({
      hostId: req.user.id,
      title,
      description,
      category,
      hourlyRate,
      location: location || { address: 'Nairobi', city: 'Nairobi' },
      amenities,
      images,
    });

    res.status(201).json({ success: true, listing });
  } catch (error) {
    res.status(500).json({ message: error.message });
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