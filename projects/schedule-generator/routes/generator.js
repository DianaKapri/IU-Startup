const express = require('express');
const router = express.Router();

// тестовый endpoint
router.post('/validate-input', (req, res) => {
  const data = req.body;

  if (!data || Object.keys(data).length === 0) {
    return res.json({
      ok: false,
      errors: ['Пустой input']
    });
  }

  return res.json({
    ok: true,
    message: 'Input получен',
    receivedKeys: Object.keys(data)
  });
});

module.exports = router;
