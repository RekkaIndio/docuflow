import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document';

// Polyfill localStorage for SSR to prevent "localStorage is not defined" or "not a function" errors
if (typeof window === 'undefined') {
    try {
        const noop = () => { };
        const storageMock = {
            getItem: (_key: string) => null,
            setItem: (_key: string, _value: string) => { },
            removeItem: (_key: string) => { },
            clear: () => { },
            length: 0,
            key: (_index: number) => null,
        };

        // Safely assign to global if it doesn't have it or if it's broken
        if (!global.localStorage || typeof global.localStorage.getItem !== 'function') {
            Object.defineProperty(global, 'localStorage', {
                value: storageMock,
                writable: true
            });
        }
    } catch (e) {
        // ignore errors defining property
    }
}

class MyDocument extends Document {
    static async getInitialProps(ctx: DocumentContext) {
        const initialProps = await Document.getInitialProps(ctx);
        return { ...initialProps };
    }

    render() {
        return (
            <Html lang="en">
                <Head />
                <body>
                    <Main />
                    <NextScript />
                </body>
            </Html>
        );
    }
}

export default MyDocument;
