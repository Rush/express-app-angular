
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');

var app = express();

var cookieParser = express.cookieParser("<set some secret>");

// all environments
// 
app.set("trust proxy", true);
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.compress());
var isProduction = (process.env.NODE_ENV === 'production');

app.use(require('less-middleware')({
  src: __dirname + '/src',
  dest: __dirname + '/public',
  compress: isProduction,
  optimization: isProduction ? 2 : 0,
  debug: !isProduction,
  once: isProduction
}));

app.use(cookieParser);

app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
if (isProduction)
  app.use(express.static(path.join(__dirname, 'public-built')));
else
  app.use(express.static(path.join(__dirname, 'src')));

// development only
if (!isProduction) {
  app.use(express.errorHandler());
  // tells jade to generate pretty html
  app.locals.pretty = true
}

app.get('/', routes.index);
app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

process.addListener("uncaughtException", function(err) {
  console.log("Uncaught exception: " + err);
  console.log(err.stack);
});