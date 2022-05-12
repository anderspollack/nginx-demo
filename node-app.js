const http = require('http');

const hostname = '127.0.0.1';
const port = 5678;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  res.end(`
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"/>
      <title>Document</title>
    </head>
    <body>
      <h1>Fancy Node App</h1>
      <img src="https://1.bp.blogspot.com/-ioP8upBQiXo/T_pNt_EY4aI/AAAAAAAAD-8/KHhoI2Jcc5s/s1600/crystal+rotating+gif.gif">
    </body>
    </html>
  `);
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
