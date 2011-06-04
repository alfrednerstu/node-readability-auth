var connect = require('connect')
  , readabilityauth = module.exports = {};

readabilityauth.Promise = require('./lib/promise');

readabilityauth.helpExpress = require('./lib/expressHelper');

readabilityauth.debug = false;

// The connect middleware
// e.g.,
//     connect(
//         connect.bodyParser()
//       , connect.cookieParser()
//       , connect.session({secret: 'oreo'})
//       , readabilityauth.middleware()
//     )
readabilityauth.middleware = function () {
  var app = connect(
      function registerReqGettersAndMethods (req, res, next) {
        var methods = readabilityauth._req._methods
          , getters = readabilityauth._req._getters;
        for (var name in methods) {
          req[name] = methods[name];
        }
        for (name in getters) {
          Object.defineProperty(req, name, {
            get: getters[name]
          });
        }
        next();
      }
    , function fetchUserFromSession (req, res, next) {
        var sess = req.session
          , auth = sess && sess.auth
          , everymodule, findUser;
        if (!auth) return next();
        if (!auth.userId) return next();
        everymodule = readabilityauth.everymodule;
        if (!everymodule._findUserById) return next();
        everymodule._findUserById(auth.userId, function (err, user) {
          if (err) throw err; // TODO Leverage readabilityauth's error handling
          if (user) req.user = user;
          next();
        });
      }
    , connect.router(function (app) {
        var modules = readabilityauth.enabled
          , _module;
        for (var _name in modules) {
          _module = modules[_name];
          _module.validateSteps();
          _module.routeApp(app);
        }
      })
  );
  return app;
};

readabilityauth._req = {
    _methods: {}
  , _getters: {}
};
readabilityauth.addRequestMethod = function (name, fn) {
  this._req._methods[name] = fn;
  return this;
};

readabilityauth.addRequestGetter = function (name, fn, isAsync) {
  this._req._getters[name] = fn;
  return this;
};

readabilityauth
  .addRequestMethod('logout', function () {
    var req = this;
    delete req.session.auth;

  }).addRequestGetter('loggedIn', function () {
    var req = this;
    if (req.session.auth && req.session.auth.loggedIn) {
      return true;
    } else {
      return false;
    }
  });

readabilityauth.modules = {};
readabilityauth.enabled = {};
var includeModules = [['oauth', false], ['readability', true]];

for (var i = 0, l = includeModules.length; i < l; i++) {
  var name = includeModules[i][0]
    , isRoutable = includeModules[i][1];
  Object.defineProperty(readabilityauth, name, {
    get: (function (name, isRoutable) {
      return function () {
        var mod = this.modules[name] || (this.modules[name] = require('./lib/' + name));
        // Make `readabilityauth` accessible from each 
        // auth strategy module
        mod.readabilityauth = this;
        if (isRoutable)
          this.enabled[name] = mod;
        return mod;
      }
    })(name, isRoutable)
  });
};

