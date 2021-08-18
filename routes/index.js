var express = require('express');
var router = express.Router();

router.get('/', function (req, res, next) {
    res.send("Query a transfer at /api/signedTransfer");
});

module.exports = router;
