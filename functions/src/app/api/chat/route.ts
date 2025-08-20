export async function POST(req: Request) {
	try {
		const body = await req.json().catch(() => ({}));
		return new Response(JSON.stringify({ ok: true, received: body }), { status: 200 });
	} catch (e) {
		return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
	}
}
