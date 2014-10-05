/*!
 * serve-favicon
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

/** @private */
var etag = require('etag');
/** @private */
var fresh = require('fresh');
/** @private */
var fs = require('fs');
/** @private */
var ms = require('ms');
/** @private */
var path = require('path');
/** @private */
var resolve = path.resolve;

/**
 * Module variables.
 */

/** @private */
var maxMaxAge = 60 * 60 * 24 * 365 * 1000; // 1 year

/**
 * Serves the favicon located by the given `path`.
 *
 * @param {String|Buffer} path
 * @param {Object} options
 * @return {Function} middleware
 * @api public
 */

module.exports = function favicon(path, options){
  options = options || {};

  var buf;
  var icon; // favicon cache
  var maxAge = calcMaxAge(options.maxAge);
  var stat;

  if (!path) throw new TypeError('path to favicon.ico is required');

  if (Buffer.isBuffer(path)) {
    buf = new Buffer(path.length);
    path.copy(buf);

    icon = createIcon(buf, maxAge);
  } else if (typeof path === 'string') {
    path = resolve(path);
    stat = fs.statSync(path);
    if (stat.isDirectory()) throw createIsDirError(path);
  } else {
    throw new TypeError('path to favicon.ico must be string or buffer');
  }

  return function favicon(req, res, next){
    if ('/favicon.ico' !== req.url) return next();

    if ('GET' !== req.method && 'HEAD' !== req.method) {
      var status = 'OPTIONS' === req.method ? 200 : 405;
      res.writeHead(status, {'Allow': 'GET, HEAD, OPTIONS'});
      res.end();
      return;
    }

    if (icon) return send(req, res, icon);

    fs.readFile(path, function(err, buf){
      if (err) return next(err);
      icon = createIcon(buf, maxAge);
      send(req, res, icon);
    });
  };
};

/** @private */
function calcMaxAge(val) {
  var num = typeof val === 'string'
    ? ms(val)
    : val;

  return num != null
    ? Math.min(Math.max(0, num), maxMaxAge)
    : maxMaxAge
}

/** @private */
function createIcon(buf, maxAge) {
  return {
    body: buf,
    headers: {
      'Cache-Control': 'public, max-age=' + ~~(maxAge / 1000),
      'ETag': etag(buf)
    }
  };
}

/** @private */
function createIsDirError(path) {
  var error = new Error('EISDIR, illegal operation on directory \'' + path + '\'');
  error.code = 'EISDIR';
  error.errno = 28;
  error.path = path;
  error.syscall = 'open';
  return error;
}

/** @private */
function send(req, res, icon) {
  var headers = icon.headers;

  // Set headers
  for (var header in headers) {
    res.setHeader(header, headers[header]);
  }

  if (fresh(req.headers, res._headers)) {
    res.statusCode = 304;
    res.end();
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Length', icon.body.length);
  res.setHeader('Content-Type', 'image/x-icon');
  res.end(icon.body);
}
