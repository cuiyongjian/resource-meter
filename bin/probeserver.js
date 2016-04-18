var probe = require('../index').probe;
var http = require('http');

var server = http.createServer(function (req, res) {
    console.log('请求到来');
    res.writeHead(200, {
        'Content-Type': 'application/json'
    });
    if (req.url === '/api') {
        console.log('api 请求');
        var rel = probe();
        res.end(JSON.stringify(rel));
    }
    else {
        res.end('非法请求');
    }
});

probe.start(server);



