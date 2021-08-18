var express = require('express');
var path = require('path');
var indexRouter = require('./routes/index');
var apiRouter = require('./routes/api');
var cors = require('cors')


var app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.use('/', indexRouter);
app.use('/api', apiRouter);

module.exports = app;
