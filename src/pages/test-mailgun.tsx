import React, { useState } from 'react';

export default function TestMailgunPage() {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('Test from Docuflow');
  const [text, setText] = useState('Hello from Docuflow via Mailgun');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [template, setTemplate] = useState('');
  // For welcome template vars
  const [welcomeName, setWelcomeName] = useState('');
  // For admin-upload template vars
  const [adminManagerName, setAdminManagerName] = useState('');
  const [adminUploadedBy, setAdminUploadedBy] = useState('');
  const [adminDocumentName, setAdminDocumentName] = useState('');
  const [adminUploadedAt, setAdminUploadedAt] = useState('');
    // For missing-docs template vars
    const [missingManagerName, setMissingManagerName] = useState('');
    const [missingHomeName, setMissingHomeName] = useState('');
    const [missingMonth, setMissingMonth] = useState('');
    const [missingList, setMissingList] = useState('');

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['X-MAILGUN-TEST-TOKEN'] = token;

      let bodyObj: any = { to, subject, text };

      if (template === 'welcome') {
        bodyObj = {
          to,
          subject: 'Welcome to Docuflow!',
          template: 'welcome',
          vars: { name: welcomeName },
        };
      } else if (template === 'admin-upload') {
        bodyObj = {
          to,
          subject: 'A document has been uploaded',
          template: 'admin-upload',
          vars: {
            managerName: adminManagerName,
            uploadedBy: adminUploadedBy,
            documentName: adminDocumentName,
            uploadedAt: adminUploadedAt,
          },
        };
        } else if (template === 'missing-docs') {
          bodyObj = {
            to,
            subject: 'Missing documents for the month',
            template: 'missing-docs',
            vars: {
              managerName: missingManagerName,
              homeName: missingHomeName,
              month: missingMonth,
              missingList: missingList,
            },
          };
      }

      const res = await fetch('/api/mailgun-test', {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyObj),
      });
      const body = await res.json().catch(() => null);
      setResult({ status: res.status, ok: res.ok, body });
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h1>Mailgun Test</h1>
      <form onSubmit={handleSend} style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
        <label>
          Email template
          <select value={template} onChange={e => setTemplate(e.target.value)} style={{ width: '100%' }}>
            <option value="">-- Plain text --</option>
            <option value="welcome">Welcome email</option>
            <option value="admin-upload">Admin upload notification</option>
              <option value="missing-docs">Missing documents notification</option>
          </select>
        </label>
        <label>
          Test token (if required)
          <input value={token} onChange={e => setToken(e.target.value)} placeholder="X-MAILGUN-TEST-TOKEN value" style={{ width: '100%' }} />
        </label>
        <label>
          To
          <input value={to} onChange={e => setTo(e.target.value)} placeholder="recipient@example.com" style={{ width: '100%' }} />
        </label>
        {template === 'welcome' ? (
          <>
            <label>
              Name (for welcome email)
              <input value={welcomeName} onChange={e => setWelcomeName(e.target.value)} placeholder="Recipient name" style={{ width: '100%' }} />
            </label>
          </>
        ) : template === 'admin-upload' ? (
          <>
            <label>
              Manager name
              <input value={adminManagerName} onChange={e => setAdminManagerName(e.target.value)} placeholder="Manager name" style={{ width: '100%' }} />
            </label>
            <label>
              Uploaded by
              <input value={adminUploadedBy} onChange={e => setAdminUploadedBy(e.target.value)} placeholder="Uploader name" style={{ width: '100%' }} />
            </label>
            <label>
              Document name
              <input value={adminDocumentName} onChange={e => setAdminDocumentName(e.target.value)} placeholder="Document name" style={{ width: '100%' }} />
            </label>
            <label>
              Uploaded at
              <input value={adminUploadedAt} onChange={e => setAdminUploadedAt(e.target.value)} placeholder="Date/time" style={{ width: '100%' }} />
            </label>
          </>
          ) : template === 'missing-docs' ? (
            <>
              <label>
                Manager name
                <input value={missingManagerName} onChange={e => setMissingManagerName(e.target.value)} placeholder="Manager name" style={{ width: '100%' }} />
              </label>
              <label>
                Home name
                <input value={missingHomeName} onChange={e => setMissingHomeName(e.target.value)} placeholder="Home name" style={{ width: '100%' }} />
              </label>
              <label>
                Month
                <input value={missingMonth} onChange={e => setMissingMonth(e.target.value)} placeholder="Month" style={{ width: '100%' }} />
              </label>
              <label>
                Missing documents (comma separated)
                <input value={missingList} onChange={e => setMissingList(e.target.value)} placeholder="e.g. Fire Drill Log, Medication Chart" style={{ width: '100%' }} />
              </label>
            </>
        ) : (
          <>
            <label>
              Subject
              <input value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%' }} />
            </label>
            <label>
              Text
              <textarea value={text} onChange={e => setText(e.target.value)} rows={6} style={{ width: '100%' }} />
            </label>
          </>
        )}
        <div>
          <button type="submit" disabled={loading || !to}>{loading ? 'Sending...' : 'Send test email'}</button>
        </div>
  </form>

      <div style={{ marginTop: 24 }}>
        <h3>Result</h3>
        <pre style={{ background: '#111', color: '#eee', padding: 12 }}>{JSON.stringify(result, null, 2)}</pre>
      </div>
    </div>
  );
}
