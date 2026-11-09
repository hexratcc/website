const activity_url = 'https://github-contributions-api.jogruber.de/v4/hexratcc?y=last';
const activity_key = 'activity';

async function fetch_activity() {
	try {
		const res = await fetch(activity_url);
		const body = await res.text();
		if (res.ok && JSON.parse(body).contributions?.length) {
			return body;
		}
	} catch (error) {
		console.error('activity fetch failed:', error);
	}
	return null;
}

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		if (url.pathname !== '/api/activity') {
			return env.ASSETS.fetch(request);
		}

		let body = await env.ACTIVITY.get(activity_key, { cacheTtl: 600 });
		if (body === null) {
			// self-heal before the first cron run
			body = await fetch_activity();
			if (body === null) {
				return new Response('activity unavailable', { status: 503 });
			}
			ctx.waitUntil(env.ACTIVITY.put(activity_key, body));
		}

		const headers = { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' };
		return new Response(body, { headers });
	},

	async scheduled(controller, env) {
		const body = await fetch_activity();
		if (body !== null) {
			await env.ACTIVITY.put(activity_key, body);
		}
	},
};
