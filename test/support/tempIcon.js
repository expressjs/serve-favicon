
var crypto = require('crypto')
var fs = require('fs')
var tempPath = require('temp-path')

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
