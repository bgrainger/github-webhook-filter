var http = require('http');
var https = require('https');
var url = require('url');

// drop all events except these ones by default
var eventWhiteList = {
	'commit_comment': true,
	'fork': true,
	'issue_comment': true,
	'issues': true,
	'pull_request': true,
	'pull_request_review_comment': true,
	'push': true
};

// Returns 'true' if the specified GitHub event type (https://developer.github.com/v3/activity/events/types/)
// should be blocked.
function blockEventType(gitHubEventType) {
	return eventWhiteList[gitHubEventType];
}

// Returns 'true' if the specified event should be blocked.
function blockEvent(gitHubEventType, eventData) {
	return gitHubEventType === 'push' && eventData.ref.substring(0, 15) === 'refs/heads/lprb';
}

// Converts 'rawHeaders' (an array of strings) into a hash of header->value. The return
// value is similar to request.headers except that the original header casing is preserved.
function getHeaders(rawHeaders) {
	var headers = {};
	for (var i = 0; i < rawHeaders.length; i += 2) {
		headers[rawHeaders[i]] = rawHeaders[i + 1];
	}
	return headers;
}

var server = http.createServer(function(request, response) {
	var parsedRequestUrl = url.parse(request.url, true);
	if (request.method === 'GET' && parsedRequestUrl.path === '/') {
		response.end('github-webhook-filter');
		return;
	}

	// get 'target' query parameter
	var targetUrl = parsedRequestUrl.query.target;
	if (!targetUrl) {
		console.error('Invalid request URL: ' + request.url);
		response.statusCode = 400;
		response.end('Missing "target" query parameter.');
		return;
	}

	console.log('got request for ' + targetUrl);
	var parsedTargetUrl = url.parse(targetUrl);

	// save the POSTed data
	var requestBuffers = [];
	request.on('data', function(chunk) {
		requestBuffers.push(chunk);
	});

	request.on('end', function() {
		try {
			// parse the JSON request
			var requestData = Buffer.concat(requestBuffers);
			var requestJson = JSON.parse(requestData.toString());

			// check if request should be filtered
			var gitHubEventType = request.headers['x-github-event'];
			if (blockEventType(gitHubEventType) || blockEvent(gitHubEventType, requestJson)) {
				// drop this request
				response.statusCode = 200;
				response.end('Event dropped by github-webhook-filter.');
				return;
			}

			// build request to specified target
			var isHttp = parsedTargetUrl.protocol === 'http:';
			var targetRequestParams = {
				protocol: parsedTargetUrl.protocol,
				hostname: parsedTargetUrl.hostname,
				port: parsedTargetUrl.port || (isHttp ? 80 : 443),
				method: request.method,
				path: parsedTargetUrl.path,
				headers: getHeaders(request.rawHeaders),
				agent: false
			};
			targetRequestParams.headers.Host = parsedTargetUrl.host;
			console.log('Making request to ' + targetRequestParams.hostname);
			var targetRequest = (isHttp ? http : https).request(targetRequestParams, function(targetResponse) {
				// send target's response back to GitHub
				response.writeHead(targetResponse.statusCode, targetResponse.statusMessage, getHeaders(targetResponse.rawHeaders));
				targetResponse.pipe(response);
			});

			// post received JSON to the target
			targetRequest.write(requestData);
			targetRequest.end();			
		} catch(e) {
			console.error('ERROR: ' + e);
			console.error(e.stack);
			response.statusCode = 500;
			response.end();
		}
	});
});

console.log('Server listening on port ' + process.env.PORT);
server.listen(process.env.PORT);
