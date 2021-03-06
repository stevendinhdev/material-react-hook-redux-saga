const express = require('express');
const router = express.Router();
const recordCtrl = require('../controllers/records');

// Get records listing and create one
router.route('/')
  .get(recordCtrl.list)
  .post(recordCtrl.create);

// export html
router.route('/export')
  .get(recordCtrl.exportRecords);

// get, update, remove a record by id.
router.route('/:id')
  .get(recordCtrl.read)
  .put(recordCtrl.update)
  .delete(recordCtrl.remove);

// get record by id.
router.param('id', recordCtrl.getRecordById);

module.exports = router;
