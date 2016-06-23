var os = require('os')
var path = require('path')
var test = require('tape')
var kill = require('tree-kill')
var spawn = require('win-spawn')
var npmSpawn = require('npm-execspawn')
var request = require('request')
var concat = require('concat-stream')
var noop = function () {}

var cliPath = path.resolve(__dirname, '..', 'bin.js')

function run (t, port, cb) {
  var ipList = getIPList()
  var server = 'http://' + ipList[0] + ':' + port
  var startMsg = 'server started at:'
  var proc = spawn(cliPath, ['app.js'], {cwd: __dirname, env: process.env})
  waitFor(startMsg, proc.stderr, function (output) {
    t.ok(output.indexOf(startMsg) > -1, startMsg)
    request({url: server + '/app.js'}, function (_, resp, bundle) {
      var bfy = npmSpawn('browserify ' + 'app.js', {cwd: __dirname, env: process.env})
      bfy.stdout.pipe(concat(function gotbundle (bundle2) {
        t.equal(bundle.toString(), bundle2.toString(), 'bundles match')
        proc.on('exit', cb || noop)
        kill(proc.pid)
      }))
    })
  })
}

test('single entry', function (t) {
  run(t, 9966, function () {
    t.end()
  })
})

test('portfinder', function (t) {
  var server = require('http').createServer()

  server.listen(9966, function () {
    run(t, 9967, function () {
      t.end()
      server.close()
    })
  })
})

function waitFor (string, stream, cb) {
  var buf = []
  var done = false
  stream.on('data', function (ch) {
    if (done) return
    buf.push(ch)
    var str = Buffer.concat(buf).toString()
    if (str.indexOf(string) > -1) {
      done = true
      cb(str)
    }
  })
  stream.on('end', function () {
    if (!done) cb('')
  })
}

function getIPList () {
  var ifaces = os.networkInterfaces()
  var ipList = []
  Object.keys(ifaces).forEach(function (ifname) {
    ifaces[ifname].forEach(function (iface) {
      if (iface.family === 'IPv4') {
        ipList.push(iface.address)
      }
    })
  })
  return ipList
}
