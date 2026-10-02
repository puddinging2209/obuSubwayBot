import http from 'node:http';

export function startHealthServer(port) {
	return http
		.createServer((req, res) => {
			res.write('Bot is alive!');
			res.end();
		})
		.listen(port);
}
