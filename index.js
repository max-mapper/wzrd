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

  var indexHtmlHandler = function(req, res, params) {
    fs.exists(path.join(basedir, 'index.html'), function(exists) {
      var firstEntry = opts.entries[0].to
      if (exists) {
        req.url = '/index.html'
        return staticHandler(req, res)
      }
      else module.exports.generateIndex(firstEntry, req, res)
    })
  }

  opts.entries.forEach(function(entry) {
    router.addRoute('/' + entry.to, function(req, res, params) {
      module.exports.browserify(entry.from, opts, req, res)
    })
  })

  router.addRoute('/', indexHtmlHandler)

  router.addRoute('*', function(req, res, params) {
    console.log(JSON.stringify({url: req.url, type: 'static', time: new Date()}))
    staticHandler(req, res, function() {
      if (opts.pushstate) return indexHtmlHandler(req, res)
      res.end('File not found. :(')
    })
  })

  return router
}

module.exports.browserify = function(entry, opts, req, res) {
  res.setHeader('content-type', 'text/javascript')
  var cmd = ['browserify', entry]
  if (opts.browserifyArgs) cmd = cmd.concat(opts.browserifyArgs)
  cmd = cmd.join(' ')
  var proc = spawn(cmd)
  var start = Date.now()
  proc.stderr.pipe(concat(function error(err) {
    if (!err.length) return
    endLog()
    process.stderr.write(err.toString())
    res.statusCode = 500
    res.end()
  }))
  proc.stdout.pipe(concat(function done(buff) {
    if (!buff.length) return
    endLog()
    res.end(buff)
  }))
  function endLog() {
    console.log(JSON.stringify({url: req.url, type: 'bundle', command: cmd, elapsed: (Date.now() - start) + 'ms', time: new Date()}))
  }
}

module.exports.generateIndex = function(entry, req, res) {
  console.log(JSON.stringify({url: req.url, type: 'generated', time: new Date()}))
  res.setHeader('content-type', 'text/html')
  res.end('<!doctype html><head><meta charset="utf-8"></head><body><script src="' + entry + '"></script></body></html>')
}
