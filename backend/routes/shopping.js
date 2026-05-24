// ============================================
// Shopping Routes
// ============================================

const express = require('express');
const ShoppingItem = require('../models/ShoppingItem');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Helper — get partner's userId if linked
async function getLinkedUserId(userId) {
  const user = await User.findById(userId).select('linkedUserId');
  return user?.linkedUserId || null;
}

// All routes require authentication
router.use(authMiddleware);

// ============================================
// GET ALL SHOPPING ITEMS
// GET /api/shopping
// ============================================
router.get('/', async (req, res) => {
  try {
    const { type, bought } = req.query;
    const linkedUserId = await getLinkedUserId(req.userId);

    // Build $or query: own items + partner's shared items
    const orConditions = [{ userId: req.userId }];
    if (linkedUserId) orConditions.push({ userId: linkedUserId, isShared: true });

    const filter = { $or: orConditions };
    if (type) filter.type = type;
    if (bought !== undefined) filter.isBought = bought === 'true';

    const items = await ShoppingItem.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    console.error('Get shopping items error:', error);
    res.status(500).json({ error: 'Failed to get shopping items' });
  }
});

// ============================================
// GET SINGLE SHOPPING ITEM
// GET /api/shopping/:id
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const item = await ShoppingItem.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Shopping item not found' });
    }
    
    res.json(item);
  } catch (error) {
    console.error('Get shopping item error:', error);
    res.status(500).json({ error: 'Failed to get shopping item' });
  }
});

// ============================================
// CREATE SHOPPING ITEM
// POST /api/shopping
// ============================================
router.post('/', async (req, res) => {
  try {
    const item = new ShoppingItem({
      ...req.body,
      userId: req.userId
    });
    
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    console.error('Create shopping item error:', error);
    res.status(500).json({ error: 'Failed to create shopping item' });
  }
});

// ============================================
// UPDATE SHOPPING ITEM
// PUT /api/shopping/:id
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const item = await ShoppingItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!item) {
      return res.status(404).json({ error: 'Shopping item not found' });
    }
    
    res.json(item);
  } catch (error) {
    console.error('Update shopping item error:', error);
    res.status(500).json({ error: 'Failed to update shopping item' });
  }
});

// ============================================
// MARK AS BOUGHT
// PATCH /api/shopping/:id/bought
// ============================================
router.patch('/:id/bought', async (req, res) => {
  try {
    const { isBought } = req.body;
    const item = await ShoppingItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { 
        isBought,
        boughtAt: isBought ? new Date() : null,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!item) {
      return res.status(404).json({ error: 'Shopping item not found' });
    }
    
    res.json(item);
  } catch (error) {
    console.error('Mark bought error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// ============================================
// DELETE SHOPPING ITEM
// DELETE /api/shopping/:id
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const item = await ShoppingItem.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Shopping item not found' });
    }
    
    res.json({ message: 'Shopping item deleted successfully' });
  } catch (error) {
    console.error('Delete shopping item error:', error);
    res.status(500).json({ error: 'Failed to delete shopping item' });
  }
});

module.exports = router;
