
process.env.NODE_ENV = 'test';

var favicon = require('..');
var http = require('http');
var path = require('path');
var request = require('supertest');
var should = require('should');

var fixtures = __dirname + '/fixtures';

describe('favicon()', function(){
  describe('arguments', function(){
    describe('path', function(){
      it('should be required', function(){
        favicon.bind().should.throw(/path.*required/);
      })

      it('should exist', function(){
        favicon.bind(null, path.join(fixtures, 'nothing')).should.throw(/ENOENT.*nothing/);
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
  });
});

function createServer(icon, opts) {
  icon = icon || path.join(fixtures, 'favicon.ico');

  var _favicon = favicon(icon, opts);
  var server = http.createServer(function onRequest(req, res) {
    _favicon(req, res, function onNext(err) {
      res.statusCode = err ? 500 : 404;
      res.end(err ? err.stack : 'oops');
    });
  });

  return server;
}
