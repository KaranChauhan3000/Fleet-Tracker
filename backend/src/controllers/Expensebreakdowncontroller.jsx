const mongoose = require('mongoose');
const { FuelLog, Challan, ServiceLog, Vehicle } = require('../models');
const InsurancePolicy = require('../models/InsurancePolicy');

const toOid = id => new mongoose.Types.ObjectId(String(id));

// ── GET /api/admin/expense-breakdown?year=&month= ─────────────────
// Returns a detailed breakdown of all expenses (fuel, challans, services)
// for the requested month, grouped by vehicle and category.
exports.getExpenseBreakdown = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const now = new Date();
    const parsedYear  = parseInt(req.query.year);
    const parsedMonth = parseInt(req.query.month);
    const reqYear  = (!isNaN(parsedYear)  && parsedYear  > 2000) ? parsedYear  : now.getFullYear();
    const reqMonth = (!isNaN(parsedMonth) && parsedMonth >= 0 && parsedMonth <= 11) ? parsedMonth : now.getMonth();

    const monthStart = new Date(reqYear, reqMonth, 1);
    const monthEnd   = new Date(reqYear, reqMonth + 1, 1);

    // ── Parallel fetch: fuel logs, challans, service logs, vehicles ──
    const [fuelByVehicle, challanByVehicle, serviceByVehicle, insuranceByVehicle, vehicles, fuelDailyTrend, challanList, serviceList, insuranceList] = await Promise.all([

      // Fuel grouped by vehicle
      FuelLog.aggregate([
        { $match: { companyId: toOid(cid), filledAt: { $gte: monthStart, $lt: monthEnd } } },
        { $group: {
          _id: '$vehicleId',
          totalCost: { $sum: '$totalCost' },
          totalLitres: { $sum: '$litres' },
          fills: { $sum: 1 },
          totalKm: { $sum: { $ifNull: ['$kmDriven', 0] } },
          avgEfficiency: { $avg: { $cond: [{ $ne: ['$efficiency', null] }, '$efficiency', '$$REMOVE'] } },
        }},
        { $sort: { totalCost: -1 } },
      ]),

      // Challans grouped by vehicle (only paid = actual money spent)
      Challan.aggregate([
        { $match: { companyId: toOid(cid), status: 'paid', issuedAt: { $gte: monthStart, $lt: monthEnd } } },
        { $group: {
          _id: '$vehicleId',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        }},
      ]),

      // Service logs grouped by vehicle
      ServiceLog.aggregate([
        { $match: { companyId: toOid(cid), servicedAt: { $gte: monthStart, $lt: monthEnd }, cost: { $ne: null } } },
        { $group: {
          _id: '$vehicleId',
          totalCost: { $sum: '$cost' },
          count: { $sum: 1 },
        }},
      ]),

      // Insurance policies — match by startDate in this month
      InsurancePolicy.aggregate([
        { $match: { companyId: toOid(cid), startDate: { $gte: monthStart, $lt: monthEnd }, isActive: true } },
        { $group: {
          _id: '$vehicleId',
          totalPremium: { $sum: '$premiumAmount' },
          count: { $sum: 1 },
        }},
      ]),

      // All vehicles for lookup
      Vehicle.find({ companyId: cid }).select('plateNumber make model').lean(),

      // Daily fuel spend trend for the month
      FuelLog.aggregate([
        { $match: { companyId: toOid(cid), filledAt: { $gte: monthStart, $lt: monthEnd } } },
        { $group: {
          _id: { $dayOfMonth: '$filledAt' },
          cost: { $sum: '$totalCost' },
          litres: { $sum: '$litres' },
          fills: { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
      ]),

      // Individual challan entries (only paid)
      Challan.find({ companyId: cid, status: 'paid', issuedAt: { $gte: monthStart, $lt: monthEnd } })
        .populate('vehicleId', 'plateNumber make model')
        .sort({ issuedAt: -1 })
        .lean(),

      // Individual service log entries
      ServiceLog.find({ companyId: cid, servicedAt: { $gte: monthStart, $lt: monthEnd }, cost: { $ne: null } })
        .populate('vehicleId', 'plateNumber make model')
        .sort({ servicedAt: -1 })
        .lean(),

      // Individual insurance policy entries (started this month)
      InsurancePolicy.find({ companyId: cid, startDate: { $gte: monthStart, $lt: monthEnd }, isActive: true })
        .populate('vehicleId', 'plateNumber make model')
        .sort({ startDate: -1 })
        .lean(),
    ]);

    // ── Build vehicle map ─────────────────────────────────────────
    const vehicleMap = {};
    for (const v of vehicles) {
      vehicleMap[String(v._id)] = v;
    }

    // ── Merge per-vehicle data ────────────────────────────────────
    const vehicleSet = new Set([
      ...fuelByVehicle.map(f => String(f._id)),
      ...challanByVehicle.map(c => String(c._id)),
      ...serviceByVehicle.map(s => String(s._id)),
      ...insuranceByVehicle.map(i => String(i._id)),
    ]);

    const fuelMap      = Object.fromEntries(fuelByVehicle.map(f      => [String(f._id), f]));
    const challanMap   = Object.fromEntries(challanByVehicle.map(c   => [String(c._id), c]));
    const serviceMap   = Object.fromEntries(serviceByVehicle.map(s   => [String(s._id), s]));
    const insuranceMap = Object.fromEntries(insuranceByVehicle.map(i => [String(i._id), i]));

    const byVehicle = [];
    for (const vid of vehicleSet) {
      const vehicle   = vehicleMap[vid];
      const fuel      = fuelMap[vid]      || { totalCost: 0, totalLitres: 0, fills: 0, totalKm: 0, avgEfficiency: null };
      const challan   = challanMap[vid]   || { totalAmount: 0, count: 0 };
      const service   = serviceMap[vid]   || { totalCost: 0, count: 0 };
      const insurance = insuranceMap[vid] || { totalPremium: 0, count: 0 };
      const total     = fuel.totalCost + challan.totalAmount + service.totalCost + insurance.totalPremium;

      byVehicle.push({
        vehicleId: vid,
        plateNumber: vehicle?.plateNumber || 'Unknown',
        make: vehicle?.make || '',
        model: vehicle?.model || '',
        total: parseFloat(total.toFixed(2)),
        fuel: {
          total: parseFloat((fuel.totalCost || 0).toFixed(2)),
          litres: parseFloat((fuel.totalLitres || 0).toFixed(1)),
          fills: fuel.fills || 0,
          km: parseFloat((fuel.totalKm || 0).toFixed(1)),
          avgKmpl: fuel.avgEfficiency ? parseFloat(fuel.avgEfficiency.toFixed(2)) : null,
        },
        challans: {
          total: parseFloat((challan.totalAmount || 0).toFixed(2)),
          count: challan.count || 0,
        },
        services: {
          total: parseFloat((service.totalCost || 0).toFixed(2)),
          count: service.count || 0,
        },
        insurance: {
          total: parseFloat((insurance.totalPremium || 0).toFixed(2)),
          count: insurance.count || 0,
        },
      });
    }

    byVehicle.sort((a, b) => b.total - a.total);

    // ── Category totals ───────────────────────────────────────────
    const totalFuel      = byVehicle.reduce((s, v) => s + v.fuel.total, 0);
    const totalChallan   = byVehicle.reduce((s, v) => s + v.challans.total, 0);
    const totalService   = byVehicle.reduce((s, v) => s + v.services.total, 0);
    const totalInsurance = byVehicle.reduce((s, v) => s + v.insurance.total, 0);
    const grandTotal     = totalFuel + totalChallan + totalService + totalInsurance;

    // ── Fill daily trend for all days in month ────────────────────
    const daysInMonth = new Date(reqYear, reqMonth + 1, 0).getDate();
    const dailyMap    = Object.fromEntries(fuelDailyTrend.map(d => [d._id, d]));
    const dailyTrend  = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const d = dailyMap[day];
      return { day, cost: d?.cost || 0, litres: d?.litres || 0, fills: d?.fills || 0 };
    });

    res.json({
      year: reqYear,
      month: reqMonth,
      monthStart: monthStart.toISOString(),
      summary: {
        grandTotal:   parseFloat(grandTotal.toFixed(2)),
        fuel:         parseFloat(totalFuel.toFixed(2)),
        challans:     parseFloat(totalChallan.toFixed(2)),
        services:     parseFloat(totalService.toFixed(2)),
        insurance:    parseFloat(totalInsurance.toFixed(2)),
        fuelPct:      grandTotal > 0 ? Math.round((totalFuel      / grandTotal) * 100) : 0,
        challanPct:   grandTotal > 0 ? Math.round((totalChallan   / grandTotal) * 100) : 0,
        servicePct:   grandTotal > 0 ? Math.round((totalService   / grandTotal) * 100) : 0,
        insurancePct: grandTotal > 0 ? Math.round((totalInsurance / grandTotal) * 100) : 0,
      },
      byVehicle,
      dailyTrend,
      challanEntries: challanList.map(c => ({
        id: c._id,
        plateNumber: c.vehicleId?.plateNumber || 'Unknown',
        make: c.vehicleId?.make, model: c.vehicleId?.model,
        amount: c.amount, offence: c.offence, status: c.status,
        issuedAt: c.issuedAt,
      })),
      serviceEntries: serviceList.map(s => ({
        id: s._id,
        plateNumber: s.vehicleId?.plateNumber || 'Unknown',
        make: s.vehicleId?.make, model: s.vehicleId?.model,
        cost: s.cost, serviceType: s.serviceType, description: s.description,
        servicedAt: s.servicedAt,
      })),
      insuranceEntries: insuranceList.map(p => ({
        id: p._id,
        plateNumber: p.vehicleId?.plateNumber || 'Unknown',
        make: p.vehicleId?.make, model: p.vehicleId?.model,
        premiumAmount: p.premiumAmount,
        provider: p.provider,
        policyNumber: p.policyNumber,
        coverageType: p.coverageType,
        startDate: p.startDate,
        expiryDate: p.expiryDate,
      })),
    });
  } catch (err) { next(err); }
};
