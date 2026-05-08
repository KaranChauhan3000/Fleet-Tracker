const mongoose = require('mongoose');
const { Challan } = require('../models');

const toOid = id => new mongoose.Types.ObjectId(String(id));

// ── POST /api/admin/challans/parse — AI text extraction ──────────
exports.parseChallan = async (req, res, next) => {
  try {
    const { text } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ message: 'text is required' });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(503).json({ message: 'AI not configured on server' });

    const today = new Date().toISOString().split('T')[0];
    const OFFENCE_LIST = [
      'Overspeeding', 'Red Light Jumping', 'No Parking', 'Wrong Side Driving',
      'No Seat Belt', 'Mobile Usage While Driving', 'Overloading', 'No Helmet',
      'Drunk Driving', 'Document Violation', 'Lane Violation', 'Illegal Parking',
      'Reckless Driving', 'Other',
    ];

    const prompt = `Extract challan/traffic fine details from this message and return ONLY a JSON object with these exact keys. Do not include any explanation or markdown.\n\nMessage:\n${text}\n\nKeys to extract:\n- plateNumber: Indian vehicle number plate (e.g. DL01AB1234), or null\n- challanNo: challan/notice number, or null\n- offence: one of [${OFFENCE_LIST.map(o => `"${o}"`).join(', ')}], or null\n- amount: fine amount as integer in rupees, or null\n- location: location/road/place where violation occurred, or null\n- issuedAt: date of violation in YYYY-MM-DD format, or "${today}" if not found\n- dueDate: payment due date in YYYY-MM-DD format, or null\n\nReturn only valid JSON. No markdown, no explanation.`;

    const payload = JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0,
    });

    const aiResult = await new Promise((resolve, reject) => {
      const https = require('https');
      const options = {
        hostname: 'openrouter.ai',
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-Title': 'FleetPro Challan Parser',
          'Content-Length': Buffer.byteLength(payload),
        },
      };
      const reqHttp = https.request(options, (r) => {
        let data = '';
        r.on('data', chunk => { data += chunk; });
        r.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (r.statusCode >= 400) return reject(new Error(parsed?.error?.message || `OpenRouter error ${r.statusCode}`));
            resolve(parsed);
          } catch (e) { reject(new Error('Invalid JSON from OpenRouter')); }
        });
      });
      reqHttp.on('error', reject);
      reqHttp.write(payload);
      reqHttp.end();
    });

    const raw     = aiResult.choices?.[0]?.message?.content?.trim() || '';
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed  = JSON.parse(cleaned);
    res.json(parsed);
  } catch (err) { next(err); }
};

// ── GET /api/admin/challans/summary ──────────────────────────────
exports.getChallanSummary = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const agg = await Challan.aggregate([
      { $match: { companyId: toOid(cid) } },
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]);
    const result = { unpaid: { count: 0, total: 0 }, paid: { count: 0, total: 0 }, disputed: { count: 0, total: 0 } };
    agg.forEach(r => { result[r._id] = { count: r.count, total: r.total }; });
    res.json(result);
  } catch (err) { next(err); }
};

// ── GET /api/admin/challans ───────────────────────────────────────
exports.listChallans = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const { vehicleId, status, from, to, page = 1, limit = 20 } = req.query;
    const filter = { companyId: toOid(cid) };
    if (vehicleId) filter.vehicleId = toOid(vehicleId);
    if (status)    filter.status    = status;
    if (from || to) {
      filter.issuedAt = {};
      if (from) filter.issuedAt.$gte = new Date(from);
      if (to)   filter.issuedAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [challans, total] = await Promise.all([
      Challan.find(filter)
        .populate('vehicleId', 'plateNumber make model')
        .populate('driverId', 'name employeeId')
        .sort({ issuedAt: -1 })
        .skip(skip).limit(parseInt(limit)),
      Challan.countDocuments(filter),
    ]);

    res.json({
      data: challans.map(c => ({
        id: c._id, challanNo: c.challanNo, offence: c.offence,
        amount: c.amount, location: c.location, notes: c.notes,
        issuedAt: c.issuedAt, dueDate: c.dueDate, status: c.status,
        vehicleId: c.vehicleId?._id, plateNumber: c.vehicleId?.plateNumber,
        vehicleMake: c.vehicleId?.make, vehicleModel: c.vehicleId?.model,
        driverId: c.driverId?._id, driverName: c.driverId?.name, driverEmpId: c.driverId?.employeeId,
      })),
      total,
    });
  } catch (err) { next(err); }
};

// ── POST /api/admin/challans ──────────────────────────────────────
exports.createChallan = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const { vehicleId, driverId, challanNo, offence, amount, location, issuedAt, dueDate, notes } = req.body;
    if (!vehicleId || !offence || !amount) {
      return res.status(400).json({ message: 'vehicleId, offence and amount are required' });
    }
    const challan = await Challan.create({
      vehicleId: toOid(vehicleId), companyId: toOid(cid),
      driverId: driverId ? toOid(driverId) : null,
      challanNo: challanNo || '', offence, amount: parseFloat(amount),
      location: location || '', notes: notes || '',
      issuedAt: issuedAt ? new Date(issuedAt) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
    });
    res.status(201).json({ id: challan._id, ...challan.toObject() });
  } catch (err) { next(err); }
};

// ── PATCH /api/admin/challans/:id ────────────────────────────────
exports.updateChallan = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const challan = await Challan.findOne({ _id: req.params.id, companyId: toOid(cid) });
    if (!challan) return res.status(404).json({ message: 'Challan not found' });

    const { status, challanNo, offence, amount, location, dueDate, notes, driverId } = req.body;
    if (status    !== undefined) challan.status    = status;
    if (challanNo !== undefined) challan.challanNo = challanNo;
    if (offence   !== undefined) challan.offence   = offence;
    if (amount    !== undefined) challan.amount    = parseFloat(amount);
    if (location  !== undefined) challan.location  = location;
    if (dueDate   !== undefined) challan.dueDate   = dueDate ? new Date(dueDate) : null;
    if (notes     !== undefined) challan.notes     = notes;
    if (driverId  !== undefined) challan.driverId  = driverId ? toOid(driverId) : null;

    await challan.save();
    res.json({ id: challan._id, status: challan.status, amount: challan.amount });
  } catch (err) { next(err); }
};

// ── DELETE /api/admin/challans/:id ───────────────────────────────
exports.deleteChallan = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const result = await Challan.findOneAndDelete({ _id: req.params.id, companyId: toOid(cid) });
    if (!result) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
};
