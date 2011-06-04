var express = require('express')
  , readabilityauth = require('../readability-auth')
  , conf = require('./conf');

readabilityauth.debug = true;

var usersByReadabilityId = {};
    
readabilityauth.readability
  .myHostname('http://local.host:3000')
  .consumerKey(conf.readability.consumerKey)
  .consumerSecret(conf.readability.consumerSecret)
  .findOrCreateUser( function (sess, accessToken, accessSecret, reader) {
      return usersByReadabilityId[reader.username] || (usersByReadabilityId[reader.username] = reader);
  })
  .redirectPath('/');

var app = express.createServer(
    express.static(__dirname + "/public")
  , express.bodyParser()
  , express.cookieParser()
  , express.session({ secret: 'htuayreve'})
  , readabilityauth.middleware()
);

app.configure( function () {
  app.set('view engine', 'jade');
});

app.get('/', function (req, res) {
  res.render('index');
});

readabilityauth.helpExpress(app);

app.listen(3000);
