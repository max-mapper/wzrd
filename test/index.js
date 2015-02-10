var os = require('os')
var path = require('path')
var test = require('tape')
var kill = require('tree-kill')
var through = require('through2')
var spawn = require('win-spawn')
var npmSpawn = require('npm-execspawn')
var request = require('request')
var concat = require('concat-stream')
var wzrd = require('../')

var cliPath =  path.resolve(__dirname, '..', 'bin.js')

function run(t, port, cb) {
  var server = 'http://localhost:'+port
  var startMsg = 'server started at '+server
  var proc = spawn(cliPath, ['app.js'], { cwd: __dirname, env: process.env })
  waitFor(startMsg, proc.stderr, function(output) {
    t.ok(output.indexOf(startMsg) > -1, startMsg)
    request({url: server + '/app.js'}, function(err, resp, bundle) {
      var bfy = npmSpawn('browserify ' + 'app.js', { cwd: __dirname, env: process.env })
      bfy.stdout.pipe(concat(function gotbundle(bundle2) {
        t.equal(bundle.toString(), bundle2.toString(), 'bundles match')
        kill(proc.pid)
        if (cb) 
          cb()
      }))
    })
  })
}

test('single entry', function(t) {
  run(t, 9966, t.end)
})

test('portfinder', function(t) {
  var server = require('http').createServer()
  
  setTimeout(function() {
    server.listen(9966, function() {
      setTimeout(function() {
        run(t, 9967, function() {
          t.end()
          server.close()
        })
      }, 50)
    })
  }, 50)
})

function waitFor(string, stream, cb) {
  var buf = []
  var done = false
  stream.on('data', function(ch) {
    if (done) return
    buf.push(ch)
    var str = Buffer.concat(buf).toString()
    if (str.indexOf(string) > -1) {
      done = true
      cb(str)
    }
  })
  stream.on('end', function() {
    if (!done) cb('')
  })
}
