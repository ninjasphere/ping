'use strict';

var forwarded = require('forwarded-for');
var express = require('express');
var app = express();

// This will be lost when the service is shut down when idle.
// That shouldn't happen when lots of Spheres are pinging it, but
// could be kept awake using NewRelic monitoring etc..
var seen = {};

var ONE_HOUR = 1000 * 60 * 60;

setInterval(function() {

  for (var publicIP in seen) {
    for (var localIP in seen[publicIP]) {
      if ((new Date().getTime() - seen[publicIP][localIP].time) > (ONE_HOUR / 4)) {
        delete seen[publicIP][localIP];
      }
    }
  }

}, ONE_HOUR / 4);

app.get('/pong', function (req, res) {
  res.send(true);
});

app.get('/', function (req, res) {

  var publicIP = forwarded(req, req.headers).ip;
  seen[publicIP] = seen[publicIP] || {};

  var localIP = req.query.ip;

  if (localIP && localIP.length < 20 && req.query.id && req.query.id.length < 30) {
    seen[publicIP][localIP] = {
        time: new Date().getTime(),
        ip: localIP,
        id: req.query.id
    }
  }

  var ips = [];
  for (var ip in seen[publicIP]) {
    ips.push({
      age: new Date().getTime() - seen[publicIP][ip].time,
      id: seen[publicIP][ip].id,
      ip: seen[publicIP][ip].ip
    });
  }

  res.send(ips);
});

var server = app.listen((process.env.PORT || 8888), function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});
