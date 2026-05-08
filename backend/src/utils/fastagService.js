/**
 * Surepass RC-to-FASTag Balance API
 *
 * Endpoint : POST https://kyc-api.surepass.io/api/v1/fastag/rc-to-fastag-balance
 * Auth     : Bearer token from env SUREPASS_TOKEN
 * Input    : { id_number: "MH12AB1234" }
 * Output   : { success, data: { customer_name, current_balance, status,
 *               last_recharge_date, card_validity, available_recharge_limit } }
 *
 * Add your key to .env:  SUREPASS_TOKEN=your_token_here
 */

const SUREPASS_URL = 'https://kyc-api.surepass.io/api/v1/fastag/rc-to-fastag-balance';

/**
 * Fetch FASTag balance for a vehicle registration number.
 * @param {string} plateNumber  e.g. "MH12AB1234"
 * @returns {{ balance, status, lastRecharge, cardValidity, customerName }}
 * @throws Error if API key missing or call fails
 */
async function fetchFastagBalance(plateNumber) {
  const token = process.env.SUREPASS_TOKEN;
  if (!token) throw new Error('SUREPASS_TOKEN not configured in environment');

  // Normalise plate — Surepass expects no spaces, uppercase
  const rcNumber = plateNumber.replace(/\s+/g, '').toUpperCase();

  const res = await fetch(SUREPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ id_number: rcNumber }),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    const msg = json?.message || json?.error || `Surepass error (${res.status})`;
    throw new Error(msg);
  }

  const d = json.data || {};
  return {
    balance:        d.current_balance       ?? null,
    status:         d.status ?? d.card_status ?? null,
    lastRecharge:   d.last_recharge_date    ?? null,
    cardValidity:   d.card_validity         ?? null,
    customerName:   d.customer_name         ?? null,
  };
}

module.exports = { fetchFastagBalance };
