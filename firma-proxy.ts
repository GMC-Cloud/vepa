const OA_KEY = '69e654e8be2c56e89807f448';
const OA_URL = 'https://test.esignature.openapi.com';

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { pdfBase64, nome, cognome, email, telefono, numero } = body;

    if (!email || !telefono) {
      return new Response(JSON.stringify({ error: 'email e telefono obbligatori' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    if (!pdfBase64) {
      return new Response(JSON.stringify({ error: 'pdfBase64 mancante' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    let phone = telefono.replace(/\s/g, '');
    if (!phone.startsWith('+')) phone = '+39' + phone.replace(/^0/, '');

    const payload = {
      document: {
        sourceType: 'base64',
        source: pdfBase64,
        fileName: `Contratto_B4C_${numero || '001'}.pdf`
      },
      signers: [{
        name: nome || 'Cliente',
        surname: cognome || 'B4C',
        email: email,
        mobile: phone,
        authentication: ['sms'],
        message: `Gentile ${nome || 'Cliente'}, contratto B4C S.r.l. da firmare con OTP via SMS.`,
        signatures: [{ page: 1, x: 40, y: 680, width: 150, height: 50 }]
      }],
      options: {
        notificationEmail: true,
        signatureType: 'pades',
        completionRedirectUrl: 'https://veteex-cloud.github.io/vepa'
      }
    };

    const resp = await fetch(`${OA_URL}/EU-SES`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OA_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }

    return new Response(JSON.stringify({ ok: resp.ok, status: resp.status, data }), {
      status: resp.ok ? 200 : resp.status,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
});
