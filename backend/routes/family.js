// ============================================
// Family Routes
// ============================================

const express = require('express');
const FamilyMember = require('../models/FamilyMember');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================
// GET ALL FAMILY MEMBERS
// GET /api/family
// ============================================
router.get('/', async (req, res) => {
  try {
    const members = await FamilyMember.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(members);
  } catch (error) {
    console.error('Get family members error:', error);
    res.status(500).json({ error: 'Failed to get family members' });
  }
});

// ============================================
// GET SINGLE FAMILY MEMBER
// GET /api/family/:id
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const member = await FamilyMember.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!member) {
      return res.status(404).json({ error: 'Family member not found' });
    }
    
    res.json(member);
  } catch (error) {
    console.error('Get family member error:', error);
    res.status(500).json({ error: 'Failed to get family member' });
  }
});

// ============================================
// CREATE FAMILY MEMBER
// POST /api/family
// ============================================
router.post('/', async (req, res) => {
  try {
    const member = new FamilyMember({
      ...req.body,
      userId: req.userId
    });
    
    await member.save();
    res.status(201).json(member);
  } catch (error) {
    console.error('Create family member error:', error);
    res.status(500).json({ error: 'Failed to create family member' });
  }
});

// ============================================
// UPDATE FAMILY MEMBER
// PUT /api/family/:id
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const member = await FamilyMember.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!member) {
      return res.status(404).json({ error: 'Family member not found' });
    }
    
    res.json(member);
  } catch (error) {
    console.error('Update family member error:', error);
    res.status(500).json({ error: 'Failed to update family member' });
  }
});

// ============================================
// DELETE FAMILY MEMBER
// DELETE /api/family/:id
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const member = await FamilyMember.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!member) {
      return res.status(404).json({ error: 'Family member not found' });
    }
    
    res.json({ message: 'Family member deleted successfully' });
  } catch (error) {
    console.error('Delete family member error:', error);
    res.status(500).json({ error: 'Failed to delete family member' });
  }
});

module.exports = router;
