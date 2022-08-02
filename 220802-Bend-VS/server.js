/*var http = require('http');
var fs = require('fs');

const PORT=8080; 

fs.readFile('./index.html', function (err, html) {

    if (err) throw err;    

    http.createServer(function(request, response) {  
        response.writeHeader(200, {"Content-Type": "text/html"});  
        //response.writeHeader(200);  
        response.write(html);  
        response.end();  
    }).listen(PORT);
});*/

/*fs.readFile('./index.html', function (err, html) {

    if (err) throw err;    
});*/

/*http.createServer(function(request, response) {  
    response.writeHeader(200, {"Content-Type": "text/html"});  
    response.write(html);  
    response.end();  
}).listen(PORT);*/

/*const requestListener = function (req, res) {
  res.writeHead(200);
  res.end('Hello, World!');
}

const server = http.createServer(requestListener);
server.listen(8000);*/

var express = require('express');
var app = express();
var fs = require('fs');

app.use(express.static(__dirname + '/css'));
app.use(express.static(__dirname + '/js'));
app.use(express.static(__dirname + '/three.js'));
app.use(express.static(__dirname + '/node_modules'));

app.get('/index.html', function(req, res, next) {
    res.sendFile(__dirname + '/index.html');
    console.log(__dirname);
});

app.listen(8080);