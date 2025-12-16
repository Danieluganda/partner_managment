// routes/views/masterRegisterView.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// Render Master Partner Register Page
router.get('/master-register', async (req, res) => {
  try {
    // Extract filters from query (optional)
    const { type, region, status, search } = req.query;
    
    // Build API URL with query params
    let apiUrl = 'http://localhost:3000/api/master-register';
    const queryParams = new URLSearchParams();
    if (type) queryParams.append('type', type);
    if (region) queryParams.append('region', region);
    if (status) queryParams.append('status', status);
    if (search) queryParams.append('search', search);
    if ([...queryParams].length) apiUrl += `?${queryParams.toString()}`;

    // Fetch data from the API
    const apiResponse = await axios.get(apiUrl);
    const { data, stats, total } = apiResponse.data;

    // Render the EJS page with partners data and stats
    res.render('master-register', {
      partners: Array.isArray(data) ? data : [],
      stats: stats || {},
      total: total || 0,
      filters: { type, region, status, search }
    });
  } catch (error) {
    console.error('Error rendering master register page:', error.message);
    res.status(500).send('Failed to load master register page');
  }
});

module.exports = router;
