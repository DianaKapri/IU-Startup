const express = require('express');
const router = express.Router();
const validateInput = require('../services/generator/validate-input');

router.post('/validate-input', (req, res) => {
  const result = validateInput(req.body);

  return res.json(result);
});

module.exports = router;
