const mongoose = require('mongoose');
const { User, Vehicle, FuelLog, Challan, ServiceLog, VehicleFinance, InsurancePolicy } = require('../models');

const toOid = id => new mongoose.Types.ObjectId(String(id));

// ── GET /api/admin/stats ──────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const cid = req.user.companyId;

    const [users, vehicles, fuelLogs, activeFuelLogs, recentLogs] = await Promise.all([
      User.countDocuments({ companyId: cid }),
      Vehicle.countDocuments({ companyId: cid }),
      FuelLog.countDocuments({ companyId: cid }),
      User.countDocuments({ companyId: cid, isActive: true }),
      FuelLog.find({ companyId: cid }).populate('vehicleId', 'plateNumber').populate('userId', 'name').sort({ filledAt: -1 }).limit(5),
    ]);

    const spendAgg = await FuelLog.aggregate([
      { $match: { companyId: toOid(cid) } },
      { $group: { _id: null, total: { $sum: '$totalCost' }, litres: { $sum: '$litres' }, totalKm: { $sum: { $ifNull: ['$kmDriven', 0] } } } },
    ]);

    const now = new Date();
    const parsedYear  = parseInt(req.query.year);
    const parsedMonth = parseInt(req.query.month);
    const reqYear  = (!isNaN(parsedYear)  && parsedYear  > 2000) ? parsedYear  : now.getFullYear();
    const reqMonth = (!isNaN(parsedMonth) && parsedMonth >= 0 && parsedMonth <= 11) ? parsedMonth : now.getMonth();
    const monthStart = new Date(reqYear, reqMonth, 1);
    const monthEnd   = new Date(reqYear, reqMonth + 1, 1);

    const [monthAgg, monthChallanAgg, monthServiceAgg, monthInsuranceAgg, monthLogs, monthEmiAgg] = await Promise.all([
      FuelLog.aggregate([
        { $match: { companyId: toOid(cid), filledAt: { $gte: monthStart, $lt: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$totalCost' }, litres: { $sum: '$litres' }, fills: { $sum: 1 }, totalKm: { $sum: { $ifNull: ['$kmDriven', 0] } } } },
      ]),
      Challan.aggregate([
        { $match: { companyId: toOid(cid), status: 'paid', paidAt: { $gte: monthStart, $lt: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      ServiceLog.aggregate([
        { $match: { companyId: toOid(cid), servicedAt: { $gte: monthStart, $lt: monthEnd }, cost: { $ne: null } } },
        { $group: { _id: null, total: { $sum: '$cost' } } },
      ]),
      InsurancePolicy.aggregate([
        { $match: { companyId: toOid(cid), startDate: { $gte: monthStart, $lt: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$premiumAmount' } } },
      ]),
      FuelLog.find({ companyId: toOid(cid), filledAt: { $gte: monthStart, $lt: monthEnd } })
        .sort({ filledAt: 1 }).select('totalCost kmDriven efficiency').lean(),
      // EMI payments approved this month
      VehicleFinance.aggregate([
        { $match: { companyId: toOid(cid), 'emiPayments.paidAt': { $gte: monthStart, $lt: monthEnd } } },
        { $unwind: '$emiPayments' },
        { $match: { 'emiPayments.status': 'approved', 'emiPayments.paidAt': { $gte: monthStart, $lt: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$emiPayments.amount' } } },
      ]),
    ]);

    const monthData = monthAgg[0] || { total: 0, litres: 0, fills: 0, totalKm: 0 };
    const monthChallanSpend = monthChallanAgg[0]?.total ?? 0;
    const monthServiceSpend = monthServiceAgg[0]?.total ?? 0;
    const monthInsuranceSpend = monthInsuranceAgg[0]?.total ?? 0;
    const monthEmiSpend = monthEmiAgg[0]?.total ?? 0;
    const monthKm = parseFloat((monthData.totalKm).toFixed(1));
    const burnedCostMonth = monthLogs.length > 1 ? monthLogs.slice(0, -1).reduce((s, l) => s + l.totalCost, 0) : 0;
    const monthCostPerKm = monthKm > 0 ? parseFloat((burnedCostMonth / monthKm).toFixed(2)) : null;
    const monthEffValues = monthLogs.map(l => l.efficiency).filter(e => e != null && e > 0);
    const monthAvgEff = monthEffValues.length
      ? parseFloat((monthEffValues.reduce((s, v) => s + v, 0) / monthEffValues.length).toFixed(2)) : null;

    // Year spend
    const currentYear = now.getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd   = new Date(currentYear + 1, 0, 1);
    const [yearAgg, yearEffAgg] = await Promise.all([
      FuelLog.aggregate([
        { $match: { companyId: toOid(cid), filledAt: { $gte: yearStart, $lt: yearEnd } } },
        { $group: { _id: null, total: { $sum: '$totalCost' }, litres: { $sum: '$litres' } } },
      ]),
      FuelLog.aggregate([
        { $match: { companyId: toOid(cid), efficiency: { $ne: null, $gt: 0 }, filledAt: { $gte: yearStart, $lt: yearEnd } } },
        { $sort: { vehicleId: 1, filledAt: -1 } },
        { $group: { _id: '$vehicleId', latestEfficiency: { $first: '$efficiency' } } },
        { $group: { _id: null, fleetAvg: { $avg: '$latestEfficiency' } } },
      ]),
    ]);

    // Overall fleet efficiency
    const overallEffAgg = await FuelLog.aggregate([
      { $match: { companyId: toOid(cid), efficiency: { $ne: null, $gt: 0 } } },
      { $sort: { vehicleId: 1, filledAt: -1 } },
      { $group: { _id: '$vehicleId', latestEfficiency: { $first: '$efficiency' } } },
      { $group: { _id: null, fleetAvg: { $avg: '$latestEfficiency' } } },
    ]);

    // Alerts helpers
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in10   = new Date(today); in10.setDate(in10.getDate() + 10);
    const in14   = new Date(today); in14.setDate(in14.getDate() + 14);
    const in7    = new Date(today); in7.setDate(in7.getDate() + 7);
    const past3  = new Date(today); past3.setDate(past3.getDate() - 3);
    const past5  = new Date(today); past5.setDate(past5.getDate() - 5);

    const [serviceAlerts, pollutionAlerts, insuranceAlerts, challanAlerts, finances] = await Promise.all([
      ServiceLog.aggregate([
        { $match: { companyId: toOid(cid), nextServiceDate: { $ne: null, $gte: past5, $lte: in14 } } },
        { $sort: { servicedAt: -1 } },
        { $group: { _id: '$vehicleId', doc: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$doc' } },
        { $lookup: { from: 'vehicles', localField: 'vehicleId', foreignField: '_id', as: 'v' } },
        { $unwind: '$v' },
      ]),
      Vehicle.find({ companyId: toOid(cid), pollutionExpiry: { $ne: null, $gte: past5, $lte: in10 } }).select('plateNumber make model pollutionExpiry'),
      Vehicle.find({ companyId: toOid(cid), insuranceExpiry: { $ne: null, $gte: past5, $lte: in10 } }).select('plateNumber make model insuranceExpiry'),
      Challan.find({ companyId: toOid(cid), status: 'unpaid', dueDate: { $ne: null, $gte: past5, $lte: in10 } }).populate('vehicleId', 'plateNumber make model').sort({ dueDate: 1 }),
      VehicleFinance.find({ companyId: toOid(cid), isActive: true, endDate: { $gte: today } }).populate('vehicleId', 'plateNumber make model').lean(),
    ]);

    const emiAlerts = [];
    for (const f of finances) {
      if (!f.vehicleId) continue;
      const now2 = new Date();
      const emiDate = new Date(now2.getFullYear(), now2.getMonth(), f.emiDay);
      if (emiDate < today) emiDate.setMonth(emiDate.getMonth() + 1);
      emiDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((emiDate - today) / 86400000);
      if (daysLeft <= 7) {
        emiAlerts.push({
          id: f._id, vehicleId: f.vehicleId._id,
          plateNumber: f.vehicleId.plateNumber, make: f.vehicleId.make, model: f.vehicleId.model,
          lenderName: f.lenderName, emiAmount: f.emiAmount,
          emiDate: emiDate.toISOString(), daysLeft, emisPaid: f.emisPaid, totalEmis: f.totalEmis,
        });
      }
    }

    res.json({
      users, vehicles, fuelLogs, activeUsers: activeFuelLogs,
      totalSpend:    spendAgg[0]?.total  ?? 0,
      totalLitres:   spendAgg[0]?.litres ?? 0,
      totalKmDriven: parseFloat((spendAgg[0]?.totalKm ?? 0).toFixed(1)),
      yearSpend: { total: yearAgg[0]?.total ?? 0, litres: yearAgg[0]?.litres ?? 0 },
      yearAvgKmpl: yearEffAgg[0]?.fleetAvg ? parseFloat(yearEffAgg[0].fleetAvg.toFixed(2)) : null,
      overallAvgKmpl: overallEffAgg[0]?.fleetAvg ? parseFloat(overallEffAgg[0].fleetAvg.toFixed(2)) : null,
      monthFuelSpend: monthData.total,
      monthChallanSpend,
      monthServiceSpend,
      monthInsuranceSpend,
      monthEmiSpend,
      monthTotalSpend: monthData.total + monthChallanSpend + monthServiceSpend + monthInsuranceSpend + monthEmiSpend,
      // Legacy key kept for backward compat
      monthSpend: monthData.total,
      monthFills: monthData.fills,
      monthLitres: parseFloat(monthData.litres.toFixed(1)),
      monthKm, monthCostPerKm, monthAvgEfficiency: monthAvgEff,
      monthStart: monthStart.toISOString(),
      browsedYear: reqYear, browsedMonth: reqMonth,
      serviceAlerts: serviceAlerts.map(a => {
        const due = new Date(a.nextServiceDate); due.setHours(0, 0, 0, 0);
        return { id: a._id, vehicleId: a.vehicleId, plateNumber: a.v.plateNumber, make: a.v.make, model: a.v.model, serviceType: a.serviceType, nextServiceDate: a.nextServiceDate, daysLeft: Math.round((due - today) / 86400000) };
      }),
      recentLogs: recentLogs.map(l => ({
        id: l._id, vehicleId: l.vehicleId?._id ?? l.vehicleId, vehiclePlate: l.vehicleId?.plateNumber ?? '',
        userName: l.userId?.name ?? '', litres: l.litres, totalCost: l.totalCost, filledAt: l.filledAt,
      })),
      pollutionAlerts: pollutionAlerts.map(v => {
        const exp = new Date(v.pollutionExpiry); exp.setHours(0, 0, 0, 0);
        return { id: v._id, plateNumber: v.plateNumber, make: v.make, model: v.model, pollutionExpiry: v.pollutionExpiry, daysLeft: Math.round((exp - today) / 86400000) };
      }),
      insuranceAlerts: insuranceAlerts.map(v => {
        const exp = new Date(v.insuranceExpiry); exp.setHours(0, 0, 0, 0);
        return { id: v._id, plateNumber: v.plateNumber, make: v.make, model: v.model, insuranceExpiry: v.insuranceExpiry, daysLeft: Math.round((exp - today) / 86400000) };
      }),
      challanAlerts: challanAlerts.map(c => {
        const due = new Date(c.dueDate); due.setHours(0, 0, 0, 0);
        return { id: c._id, plateNumber: c.vehicleId?.plateNumber, make: c.vehicleId?.make, model: c.vehicleId?.model, offence: c.offence, amount: c.amount, dueDate: c.dueDate, daysLeft: Math.round((due - today) / 86400000) };
      }),
      fastagAlerts: [],
      emiAlerts: emiAlerts.sort((a, b) => a.daysLeft - b.daysLeft),
    });
  } catch (err) { next(err); }
};

// ── GET /api/admin/stats/monthly-vehicle-breakdown ───────────────────────────
// Returns per-vehicle km + litres for a given month, sorted by km desc.
// Query params: year (YYYY), month (0-11)
exports.getMonthlyVehicleBreakdown = async (req, res, next) => {
  try {
    const cid = req.user.companyId;
    const now  = new Date();
    const parsedYear  = parseInt(req.query.year);
    const parsedMonth = parseInt(req.query.month);
    const reqYear  = (!isNaN(parsedYear)  && parsedYear  > 2000) ? parsedYear  : now.getFullYear();
    const reqMonth = (!isNaN(parsedMonth) && parsedMonth >= 0 && parsedMonth <= 11) ? parsedMonth : now.getMonth();
    const monthStart = new Date(reqYear, reqMonth, 1);
    const monthEnd   = new Date(reqYear, reqMonth + 1, 1);

    const rows = await FuelLog.aggregate([
      { $match: { companyId: toOid(cid), filledAt: { $gte: monthStart, $lt: monthEnd } } },
      { $group: {
          _id: '$vehicleId',
          totalKm:     { $sum: { $ifNull: ['$kmDriven', 0] } },
          totalLitres: { $sum: '$litres' },
          totalCost:   { $sum: '$totalCost' },
          fills:       { $sum: 1 },
          avgEff:      { $avg: { $cond: [{ $and: [{ $ne: ['$efficiency', null] }, { $gt: ['$efficiency', 0] }] }, '$efficiency', null] } },
      }},
      { $lookup: { from: 'vehicles', localField: '_id', foreignField: '_id', as: 'v' } },
      { $unwind: { path: '$v', preserveNullAndEmptyArrays: true } },
      { $project: {
          vehicleId:   '$_id',
          plateNumber: { $ifNull: ['$v.plateNumber', 'Unknown'] },
          make:        { $ifNull: ['$v.make', ''] },
          model:       { $ifNull: ['$v.model', ''] },
          fuelType:    { $ifNull: ['$v.fuelType', ''] },
          totalKm:     { $round: ['$totalKm', 1] },
          totalLitres: { $round: ['$totalLitres', 1] },
          totalCost:   { $round: ['$totalCost', 0] },
          fills:       1,
          avgEff:      { $round: ['$avgEff', 2] },
      }},
      { $sort: { totalKm: -1 } },
    ]);

    res.json({
      year: reqYear,
      month: reqMonth,
      vehicles: rows,
      totals: {
        km:     parseFloat(rows.reduce((s, r) => s + r.totalKm, 0).toFixed(1)),
        litres: parseFloat(rows.reduce((s, r) => s + r.totalLitres, 0).toFixed(1)),
        cost:   rows.reduce((s, r) => s + r.totalCost, 0),
        fills:  rows.reduce((s, r) => s + r.fills, 0),
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/admin/reports/monthly-comparison ─────────────────────
exports.monthlyComparison = async (req, res, next) => {
  try {
    const { month1, month2 } = req.query;
    if (!month1 || !month2) return res.status(400).json({ message: 'month1 and month2 required (YYYY-MM)' });

    const cid   = req.user.companyId;
    const today = new Date();

    const buildRange = (ym) => {
      const [y, m] = ym.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const isCurrentMonth = today.getFullYear() === y && today.getMonth() + 1 === m;
      const end = isCurrentMonth
        ? new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
        : new Date(y, m, 0, 23, 59, 59);
      return { start, end };
    };

    const agg = async (range) => {
      const result = await FuelLog.aggregate([
        { $match: { companyId: toOid(cid), filledAt: { $gte: range.start, $lte: range.end } } },
        { $group: {
          _id: null, totalFills: { $sum: 1 }, totalLitres: { $sum: '$litres' }, totalCost: { $sum: '$totalCost' },
          avgCostPerLitre: { $avg: '$costPerLitre' },
          avgEfficiency: { $avg: { $cond: [{ $ne: ['$efficiency', null] }, '$efficiency', '$$REMOVE'] } },
          totalKm: { $sum: { $ifNull: ['$kmDriven', 0] } },
          uniqueVehicles: { $addToSet: '$vehicleId' }, uniqueUsers: { $addToSet: '$userId' },
        }},
      ]);
      const r = result[0] || {};
      const totalKm   = parseFloat((r.totalKm   || 0).toFixed(1));
      const totalCost = parseFloat((r.totalCost || 0).toFixed(2));
      return {
        totalFills: r.totalFills || 0,
        totalLitres: parseFloat((r.totalLitres || 0).toFixed(2)),
        totalCost,
        avgCostPerLitre: r.avgCostPerLitre ? parseFloat(r.avgCostPerLitre.toFixed(2)) : 0,
        avgEfficiency: r.avgEfficiency ? parseFloat(r.avgEfficiency.toFixed(4)) : null,
        totalKm,
        costPerKm: totalKm > 0 ? parseFloat((totalCost / totalKm).toFixed(2)) : null,
        activeVehicles: r.uniqueVehicles?.length || 0,
        activeUsers:    r.uniqueUsers?.length    || 0,
        dateRange: { start: range.start, end: range.end },
      };
    };

    const [data1, data2] = await Promise.all([agg(buildRange(month1)), agg(buildRange(month2))]);
    res.json({ month1: { label: month1, ...data1 }, month2: { label: month2, ...data2 } });
  } catch (err) { next(err); }
};

// ── GET /api/admin/reports/summary ───────────────────────────────
exports.reportSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ message: 'from and to required' });

    const cid    = req.user.companyId;
    const filter = { companyId: cid, filledAt: { $gte: new Date(from), $lte: new Date(to + 'T23:59:59') } };

    const [summary, byVehicle, byUser, dailyTrend] = await Promise.all([
      FuelLog.aggregate([
        { $match: filter },
        { $group: { _id: null, totalFills: { $sum: 1 }, totalLitres: { $sum: '$litres' }, totalCost: { $sum: '$totalCost' },
          avgEff: { $avg: { $cond: [{ $ne: ['$efficiency', null] }, '$efficiency', '$$REMOVE'] } } } },
      ]),
      FuelLog.aggregate([
        { $match: filter },
        { $group: { _id: '$vehicleId', totalCost: { $sum: '$totalCost' }, totalLitres: { $sum: '$litres' }, fills: { $sum: 1 }, avgEff: { $avg: '$efficiency' } } },
        { $sort: { totalCost: -1 } }, { $limit: 20 },
        { $lookup: { from: 'vehicles', localField: '_id', foreignField: '_id', as: 'vehicle' } },
        { $unwind: { path: '$vehicle', preserveNullAndEmptyArrays: true } },
      ]),
      FuelLog.aggregate([
        { $match: filter },
        { $group: { _id: '$userId', totalCost: { $sum: '$totalCost' }, fills: { $sum: 1 }, totalLitres: { $sum: '$litres' } } },
        { $sort: { totalCost: -1 } }, { $limit: 20 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      ]),
      FuelLog.aggregate([
        { $match: filter },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$filledAt' } }, totalCost: { $sum: '$totalCost' }, fills: { $sum: 1 }, litres: { $sum: '$litres' } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({
      period: { from, to },
      summary: summary[0] || { totalFills: 0, totalLitres: 0, totalCost: 0 },
      byVehicle: byVehicle.map(v => ({ vehicleId: v._id, plateNumber: v.vehicle?.plateNumber || 'Unknown', make: v.vehicle?.make, model: v.vehicle?.model, totalCost: v.totalCost, totalLitres: v.totalLitres, fills: v.fills, avgEfficiency: v.avgEff })),
      byUser: byUser.map(u => ({ userId: u._id, userName: u.user?.name || 'Unknown', totalCost: u.totalCost, fills: u.fills, totalLitres: u.totalLitres })),
      dailyTrend,
    });
  } catch (err) { next(err); }
};