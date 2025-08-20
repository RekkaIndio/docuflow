export async function POST(req: Request) {
	// Minimal chat endpoint: echo message and attach auth info if available.
	try {
		const body = await req.json().catch(() => ({}));
		const authHeader = (req.headers as any)?.get?.('authorization') || '';
		const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
		let user: any = null;

		if (token && (process.env.FIREBASE_ADMIN_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
			try {
				// Lazy-load firebase-admin
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const admin = require('firebase-admin');
				if (!admin.apps.length) {
					if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
						const creds = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
						admin.initializeApp({ credential: admin.credential.cert(creds) });
					} else {
						admin.initializeApp();
					}
				}
				const decoded = await admin.auth().verifyIdToken(token);
				user = { uid: decoded.uid, email: decoded.email, claims: decoded };
			} catch (e) {
				console.warn('chat route token verify failed', e?.toString?.() ?? e);
			}
		}

		const message = body?.message ?? body;
		return new Response(JSON.stringify({ ok: true, messageEcho: message, user }), { status: 200 });
	} catch (e) {
		return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
	}
}
