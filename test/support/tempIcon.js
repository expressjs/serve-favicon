
var crypto = require('crypto')
var fs = require('fs')
var os = require('os')
var path = require('path')
var tmpdir = os.tmpdir || os.tmpDir

module.exports = TempIcon

function TempIcon () {
  this.data = crypto.pseudoRandomBytes(100)
  this.exists = false
  this.path = tempPath()
}

TempIcon.prototype.unlinkSync = function unlinkSync () {
  if (this.exists) {
    this.exists = false
    fs.unlinkSync(this.path)
  }
}

TempIcon.prototype.writeSync = function writeSync () {
  if (this.exists) {
    throw new Error('already written')
  } else {
    fs.writeFileSync(this.path, this.data)
    this.exists = true
  }
}

function tempPath () {
  var fileName = 'favicon-' + (Date.now() + Math.random()) + '.ico'
  return path.join(tmpdir(), fileName)
}
