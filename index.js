var ecstatic = require('ecstatic')
var Router = require('routes-router')
var concat = require('concat-stream')
var http = require('http')
var https = require('https')
var fs = require('fs')
var path = require('path')
var spawn = require('npm-execspawn')
var pem = require('pem')

module.exports.http = function(opts) {
  var handler = module.exports.static(opts)
  return http.createServer(handler)
}

module.exports.https = function(opts, cb) {
  var handler = module.exports.static(opts)
  pem.createCertificate({days: 999, selfSigned: true}, function(err, keys) {
    if (err) return cb(err)
    var server = https.createServer({key: keys.serviceKey, cert: keys.certificate}, handler)
    cb(null, server)
  })
}

module.exports.static = function(opts) {
  var basedir = opts.path || process.cwd()
  var staticHandler = ecstatic(basedir)
  var router = Router()
  
  opts.entries.forEach(function(entry) {
    router.addRoute('/' + entry.to, function(req, res, params) {
      module.exports.browserify(entry.from, req, res)
    })
  })
  
  router.addRoute('/', function(req, res, params) {
    fs.exists(path.join(basedir, 'index.html'), function(exists) {
      var firstEntry = opts.entries[0].to
      if (exists) return staticHandler(req, res)
      else module.exports.generateIndex(firstEntry, req, res)
    })
  })
  
  router.addRoute('*', function(req, res, params) {
    console.log(req.url, '(static)')
    staticHandler(req, res)
  })
  
  return router
}

module.exports.browserify = function(entry, req, res) {
  res.setHeader('content-type', 'text/javascript')
  var cmd = 'browserify ' + entry
  var proc = spawn(cmd)
  var message = req.url + ' (' + cmd + ')'
  console.time(message)
  proc.stderr.pipe(concat(function error(err) {
    if (!err.length) return
    console.timeEnd(message)
    process.stdout.write(err.toString())
    res.statusCode = 500
    res.end()
  }))
  proc.stdout.pipe(concat(function done(buff) {
    if (!buff.length) return
    console.timeEnd(message)
    res.end(buff)
  }))
}

module.exports.generateIndex = function(entry, req, res) {
  console.log(req.url, '(generated)')
  res.setHeader('content-type', 'text/html')
  res.end('<!doctype html><head><meta charset="utf-8"></head><body><script src="' + entry + '"></script></body></html>')
}
