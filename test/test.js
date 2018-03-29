
var assert = require('assert')
var Buffer = require('safe-buffer').Buffer
var favicon = require('..')
var http = require('http')
var path = require('path')
var request = require('supertest')
var TempIcon = require('./support/tempIcon')

var FIXTURES_PATH = path.join(__dirname, 'fixtures')
var ICON_PATH = path.join(FIXTURES_PATH, 'favicon.ico')

describe('favicon()', function () {
  describe('arguments', function () {
    describe('path', function () {
      it('should be required', function () {
        assert.throws(favicon.bind(), /path.*required/)
      })

      it('should accept file path', function () {
        assert.doesNotThrow(favicon.bind(null, path.join(FIXTURES_PATH, 'favicon.ico')))
      })

      it('should accept buffer', function () {
        assert.doesNotThrow(favicon.bind(null, Buffer.alloc(20)))
      })

      it('should exist', function () {
        assert.throws(favicon.bind(null, path.join(FIXTURES_PATH, 'nothing')), /ENOENT.*nothing/)
      })

      it('should not be dir', function () {
        assert.throws(favicon.bind(null, FIXTURES_PATH), /EISDIR.*fixtures/)
      })

      it('should not be number', function () {
        assert.throws(favicon.bind(null, 12), /path.*must be.*string/)
      })
    })

    describe('options.maxAge', function () {
      it('should be in cache-control', function (done) {
        var server = createServer(null, {maxAge: 5000})
        request(server)
          .get('/favicon.ico')
          .expect('Cache-Control', 'public, max-age=5')
          .expect(200, done)
      })

      it('should have a default', function (done) {
        var server = createServer()
        request(server)
          .get('/favicon.ico')
          .expect('Cache-Control', /public, max-age=[0-9]+/)
          .expect(200, done)
      })

      it('should accept 0', function (done) {
        var server = createServer(null, {maxAge: 0})
        request(server)
          .get('/favicon.ico')
          .expect('Cache-Control', 'public, max-age=0')
          .expect(200, done)
      })

      it('should accept string', function (done) {
        var server = createServer(null, {maxAge: '30d'})
        request(server)
          .get('/favicon.ico')
          .expect('Cache-Control', 'public, max-age=2592000')
          .expect(200, done)
      })

      it('should be valid delta-seconds', function (done) {
        var server = createServer(null, {maxAge: 1234})
        request(server)
          .get('/favicon.ico')
          .expect('Cache-Control', 'public, max-age=1')
          .expect(200, done)
      })

      it('should floor at 0', function (done) {
        var server = createServer(null, {maxAge: -4000})
        request(server)
          .get('/favicon.ico')
          .expect('Cache-Control', 'public, max-age=0')
          .expect(200, done)
      })

      it('should ceil at 1 year', function (done) {
        var server = createServer(null, {maxAge: 900000000000})
        request(server)
          .get('/favicon.ico')
          .expect('Cache-Control', 'public, max-age=31536000')
          .expect(200, done)
      })

      it('should accept Inifnity', function (done) {
        var server = createServer(null, {maxAge: Infinity})
        request(server)
          .get('/favicon.ico')
          .expect('Cache-Control', 'public, max-age=31536000')
          .expect(200, done)
      })
    })
  })

  describe('requests', function () {
    before(function () {
      this.server = createServer()
    })

    it('should serve icon', function (done) {
      request(this.server)
        .get('/favicon.ico')
        .expect('Content-Type', 'image/x-icon')
        .expect(200, done)
    })

    it('should include cache-control', function (done) {
      request(this.server)
        .get('/favicon.ico')
        .expect('Cache-Control', /public/)
        .expect(200, done)
    })

    it('should include strong etag', function (done) {
      request(this.server)
        .get('/favicon.ico')
        .expect('ETag', /^"[^"]+"$/)
        .expect(200, done)
    })

    it('should deny POST', function (done) {
      request(this.server)
        .post('/favicon.ico')
        .expect('Allow', 'GET, HEAD, OPTIONS')
        .expect(405, done)
    })

    it('should understand OPTIONS', function (done) {
      request(this.server)
        .options('/favicon.ico')
        .expect('Allow', 'GET, HEAD, OPTIONS')
        .expect(200, done)
    })

    it('should 304 when If-None-Match matches', function (done) {
      var server = this.server
      request(server)
        .get('/favicon.ico')
        .expect(200, function (err, res) {
          if (err) return done(err)
          request(server)
            .get('/favicon.ico')
            .set('If-None-Match', res.headers.etag)
            .expect(304, done)
        })
    })

    it('should 304 when If-None-Match matches weakly', function (done) {
      var server = this.server
      request(server)
        .get('/favicon.ico')
        .expect(200, function (err, res) {
          if (err) return done(err)
          request(server)
            .get('/favicon.ico')
            .set('If-None-Match', 'W/' + res.headers.etag)
            .expect(304, done)
        })
    })

    it('should ignore non-favicon requests', function (done) {
      request(this.server)
        .get('/')
        .expect(404, 'oops', done)
    })

    it('should work with query string', function (done) {
      request(this.server)
        .get('/favicon.ico?v=1')
        .expect('Content-Type', 'image/x-icon')
        .expect(200, done)
    })

    describe('missing req.url', function () {
      it('should ignore the request', function (done) {
        var fn = favicon(ICON_PATH)
        fn({}, {}, done)
      })
    })
  })

  describe('icon', function () {
    describe('file', function () {
      beforeEach(function () {
        this.icon = new TempIcon()
        this.icon.writeSync()
      })

      afterEach(function () {
        this.icon.unlinkSync()
        this.icon = undefined
      })

      it('should be read on first request', function (done) {
        var icon = this.icon
        var server = createServer(icon.path)

        request(server)
          .get('/favicon.ico')
          .expect(200, icon.data, done)
      })

      it('should cache for second request', function (done) {
        var icon = this.icon
        var server = createServer(icon.path)

        request(server)
          .get('/favicon.ico')
          .expect(200, icon.data, function (err) {
            if (err) return done(err)
            icon.unlinkSync()
            request(server)
              .get('/favicon.ico')
              .expect(200, icon.data, done)
          })
      })
    })

    describe('file error', function () {
      beforeEach(function () {
        this.icon = new TempIcon()
        this.icon.writeSync()
      })

      afterEach(function () {
        this.icon.unlinkSync()
        this.icon = undefined
      })

      it('should next() file read errors', function (done) {
        var icon = this.icon
        var server = createServer(icon.path)

        icon.unlinkSync()
        request(server)
          .get('/favicon.ico')
          .expect(500, /ENOENT/, done)
      })

      it('should retry reading file after error', function (done) {
        var icon = this.icon
        var server = createServer(icon.path)

        icon.unlinkSync()
        request(server)
          .get('/favicon.ico')
          .expect(500, /ENOENT/, function (err) {
            if (err) return done(err)
            icon.writeSync()
            request(server)
              .get('/favicon.ico')
              .expect(200, icon.data, done)
          })
      })
    })

    describe('buffer', function () {
      it('should be served from buffer', function (done) {
        var buffer = Buffer.alloc(20, '#')
        var server = createServer(buffer)

        request(server)
          .get('/favicon.ico')
          .expect('Content-Length', '20')
          .expect(200, buffer, done)
      })

      it('should be copied', function (done) {
        var buffer = Buffer.alloc(20, '#')
        var server = createServer(buffer)

        assert.equal(buffer.toString(), '####################')
        buffer.fill('?')
        assert.equal(buffer.toString(), '????????????????????')

        request(server)
          .get('/favicon.ico')
          .expect('Content-Length', '20')
          .expect(200, Buffer.from('####################'), done)
      })
    })
  })
})

function createServer (path, opts) {
  var _path = path || ICON_PATH
  var _favicon = favicon(_path, opts)
  var server = http.createServer(function onRequest (req, res) {
    _favicon(req, res, function onNext (err) {
      res.statusCode = err ? (err.status || 500) : 404
      res.end(err ? err.message : 'oops')
    })
  })

  return server
}
