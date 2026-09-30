export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env?.DB) {
    return json({ message: 'Waitlist service is not configured.' }, 500);
  }

  let body;
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return json({ message: 'Request must be sent as JSON.' }, 415);
    }
    body = await request.json();
  } catch {
    return json({ message: 'Invalid request body.' }, 400);
  }

  const full_name = normalize(body?.full_name, 100);
  const email = normalize(body?.email, 254).toLowerCase();
  const phone = normalize(body?.phone, 30);
  const city = normalize(body?.city, 100);
  const pet_type = normalize(body?.pet_type, 20);
  const website = normalize(body?.website, 200);

  // Honeypot: genuine users should never fill this hidden field.
  if (website) {
    return json({ success: true }, 200);
  }

  const fieldErrors = {};

  if (!full_name) {
    fieldErrors.full_name = 'Please enter your name.';
  } else if (full_name.length < 2) {
    fieldErrors.full_name = 'Please enter your full name.';
  }

  if (!email) {
    fieldErrors.email = 'Please enter your email address.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = 'Please enter a valid email address.';
  }

  const allowedPetTypes = new Set(['', 'Dog', 'Cat', 'Both', 'Other']);
  if (!allowedPetTypes.has(pet_type)) {
    fieldErrors.pet_type = 'Please select a valid pet type.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return json({ message: 'Please check your details.', fieldErrors }, 400);
  }

  try {
    const existing = await env.DB
      .prepare('SELECT id FROM waitlist WHERE email = ? LIMIT 1')
      .bind(email)
      .first();

    if (existing) {
      return json({ success: true, alreadyJoined: true }, 409);
    }

    await env.DB
      .prepare(`
        INSERT INTO waitlist (full_name, email, phone, city, pet_type)
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(full_name, email, phone || null, city || null, pet_type || null)
      .run();

    return json({ success: true }, 201);
  } catch (error) {
    // The UNIQUE constraint protects against duplicate emails even if two requests race.
    const message = error instanceof Error ? error.message : '';
    if (/unique|constraint/i.test(message)) {
      return json({ success: true, alreadyJoined: true }, 409);
    }

    return json({ message: 'Something went wrong. Please try again.' }, 500);
  }
}

function normalize(value, maxLength) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'no-store',
    },
  });
}
