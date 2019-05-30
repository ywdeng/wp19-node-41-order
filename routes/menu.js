var express = require('express');
var router = express.Router();
var prodSpec = require("../models/product.json");

router.get('/', function (req, res, next) {
  var viewbag = { prodList: prodSpec.products };
  if (req.session && req.session.user) {
    viewbag.user = req.session.user;
  }
  res.render("menu", viewbag);
});

module.exports = router;
