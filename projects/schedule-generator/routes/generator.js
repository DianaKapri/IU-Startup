const express = require('express');
const router = express.Router();
const validateInput = require('../services/generator/validate-input');
const runGenerator = require('../services/generator');

router.post('/validate-input', (req, res) => {
  const result = validateInput(req.body);
  return res.json(result);
});

router.post('/run', (req, res) => {
  const validation = validateInput(req.body);

  if (!validation.ok) {
    return res.status(400).json(validation);
  }

  const result = runGenerator(req.body);
  return res.json(result);
});

module.exports = router;
