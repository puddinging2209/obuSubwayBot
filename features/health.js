import http from 'http';
http.createServer((req, res) => {
	res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
	res.write('Bot is alive!');
	res.end();
}).listen(process.env.PORT || 10000);
