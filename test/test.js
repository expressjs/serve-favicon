
var fs = require('fs');
var http = require('http');
var path = require('path');
var proxyquire = require('proxyquire');
var request = require('supertest');
var resolve = path.resolve;
var should = require('should');

var favicon = proxyquire('..', {
  fs: {readFile: readFile}
});

var fixtures = __dirname + '/fixtures';

describe('favicon()', function(){
  describe('arguments', function(){
    describe('path', function(){
      it('should be required', function(){
        favicon.bind().should.throw(/path.*required/);
      })

      it('should accept file path', function(){
        favicon.bind(null, path.join(fixtures, 'favicon.ico')).should.not.throw();
      })

      it('should accept buffer', function(){
        favicon.bind(null, new Buffer(20)).should.not.throw();
      })

      it('should exist', function(){
        favicon.bind(null, path.join(fixtures, 'nothing')).should.throw(/ENOENT.*nothing/);
      })

      it('should not be dir', function(){
        favicon.bind(null, fixtures).should.throw(/EISDIR.*fixtures/);
      })

      it('should not be number', function(){
        favicon.bind(null, 12).should.throw(/path.*must be.*string/);
      })
    })

    describe('options.maxAge', function(){
      it('should be in cache-control', function(done){
        var server = createServer(null, {maxAge: 5000});
        request(server)
        .get('/favicon.ico')
        .expect('Cache-Control', 'public, max-age=5')
        .expect(200, done);
      })

      it('should have a default', function(done){
        var server = createServer();
        request(server)
        .get('/favicon.ico')
        .expect('Cache-Control', /public, max-age=[0-9]+/)
        .expect(200, done);
      })

      it('should accept 0', function(done){
        var server = createServer(null, {maxAge: 0});
        request(server)
        .get('/favicon.ico')
        .expect('Cache-Control', 'public, max-age=0')
        .expect(200, done);
      })

      it('should accept string', function(done){
        var server = createServer(null, {maxAge: '30d'});
        request(server)
        .get('/favicon.ico')
        .expect('Cache-Control', 'public, max-age=2592000')
        .expect(200, done);
      })

      it('should be valid delta-seconds', function(done){
        var server = createServer(null, {maxAge: 1234});
        request(server)
        .get('/favicon.ico')
        .expect('Cache-Control', 'public, max-age=1')
        .expect(200, done);
      })

      it('should floor at 0', function(done){
        var server = createServer(null, {maxAge: -4000});
        request(server)
        .get('/favicon.ico')
        .expect('Cache-Control', 'public, max-age=0')
        .expect(200, done);
      })

      it('should ceil at 1 year', function(done){
        var server = createServer(null, {maxAge: 900000000000});
        request(server)
        .get('/favicon.ico')
        .expect('Cache-Control', 'public, max-age=31536000')
        .expect(200, done);
      })

      it('should accept Inifnity', function(done){
        var server = createServer(null, {maxAge: Infinity});
        request(server)
        .get('/favicon.ico')
        .expect('Cache-Control', 'public, max-age=31536000')
        .expect(200, done);
      })
    })
  })

  describe('requests', function(){
    var server;
    before(function () {
      server = createServer();
    });

    it('should serve icon', function(done){
      request(server)
      .get('/favicon.ico')
      .expect('Content-Type', 'image/x-icon')
      .expect(200, done);
    });

    it('should include cache-control', function(done){
      request(server)
      .get('/favicon.ico')
      .expect('Cache-Control', /public/)
      .expect(200, done);
    });

    it('should include etag', function(done){
      request(server)
      .get('/favicon.ico')
      .expect('ETag', /"[^"]+"/)
      .expect(200, done);
    });

    it('should deny POST', function(done){
      request(server)
      .post('/favicon.ico')
      .expect('Allow', 'GET, HEAD, OPTIONS')
      .expect(405, done);
    });

    it('should understand OPTIONS', function(done){
      request(server)
      .options('/favicon.ico')
      .expect('Allow', 'GET, HEAD, OPTIONS')
      .expect(200, done);
    });

    it('should understand If-None-Match', function(done){
      request(server)
      .get('/favicon.ico')
      .expect(200, function(err, res){
        if (err) return done(err);
        request(server)
        .get('/favicon.ico')
        .set('If-None-Match', res.headers.etag)
        .expect(304, done);
      });
    });

    it('should ignore non-favicon requests', function(done){
      request(server)
      .get('/')
      .expect(404, 'oops', done);
    });
  });

  describe('icon', function(){
    describe('file', function(){
      var icon = path.join(fixtures, 'favicon.ico');
      var server;
      beforeEach(function () {
        readFile.resetReadCount();
        server = createServer(icon);
      });

      it('should be read on first request', function(done){
        request(server)
        .get('/favicon.ico')
        .expect(200, function(err){
          if (err) return done(err);
          readFile.getReadCount(icon).should.equal(1);
          done();
        });
      });

      it('should cache for second request', function(done){
        request(server)
        .get('/favicon.ico')
        .expect(200, function(err){
          if (err) return done(err);
          request(server)
          .get('/favicon.ico')
          .expect(200, function(err){
            if (err) return done(err);
            readFile.getReadCount(icon).should.equal(1);
            done();
          });
        });
      });
    });

    describe('file error', function(){
      var icon = path.join(fixtures, 'favicon.ico');
      var server;
      beforeEach(function () {
        readFile.resetReadCount();
        server = createServer(icon);
      });

      it('should next() file read errors', function(done){
        readFile.setNextError(new Error('oh no'));
        request(server)
        .get('/favicon.ico')
        .expect(500, 'oh no', function(err){
          if (err) return done(err);
          readFile.getReadCount(icon).should.equal(1);
          done();
        });
      });

      it('should retry reading file after error', function(done){
        readFile.setNextError(new Error('oh no'));
        request(server)
        .get('/favicon.ico')
        .expect(500, 'oh no', function(err){
          if (err) return done(err);
          request(server)
          .get('/favicon.ico')
          .expect(200, function(err){
            if (err) return done(err);
            readFile.getReadCount(icon).should.equal(2);
            done();
          });
        });
      });
    });

    describe('buffer', function(){
      var buf = new Buffer(20);
      var server;
      before(function () {
        buf.fill(35);
        server = createServer(buf);
      });

      it('should be served from buffer', function(done){
        request(server)
        .get('/favicon.ico')
        .expect('Content-Length', buf.length)
        .expect(200, done);
      });

      it('should be copied', function(done){
        buf.fill(46);
        request(server)
        .get('/favicon.ico')
        .expect('Content-Length', buf.length)
        .expect(200, function (err, res) {
          if (err) return done(err);
          should(res.body).not.be.empty;
          res.body.toString().should.equal('####################');
          done();
        });
      });
    });
  });
});

function createServer(icon, opts) {
  icon = icon || path.join(fixtures, 'favicon.ico');

  var _favicon = favicon(icon, opts);
  var server = http.createServer(function onRequest(req, res) {
    _favicon(req, res, function onNext(err) {
      res.statusCode = err ? (err.status || 500) : 404;
      res.end(err ? err.message : 'oops');
    });
  });

  return server;
}

function readFile(path, options, callback) {
  var key = resolve(path);

  readFile._readCount[key] = (readFile._readCount[key] || 0) + 1;

  if (readFile._nextError) {
    var cb = callback || options;
    var err = readFile._nextError;

    readFile._nextError = null;

    return cb (err);
  }

  return fs.readFile.apply(this, arguments);
}

readFile._nextError = null;
readFile._readCount = Object.create(null);

readFile.getReadCount = function getReadCount(path) {
  var key = resolve(path);
  return readFile._readCount[key] || 0;
};

readFile.resetReadCount = function resetReadCount() {
  readFile._readCount = Object.create(null);
};

readFile.setNextError = function setNextError(err) {
  readFile._nextError = err;
};
