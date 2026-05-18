const FuelLog = require('../models/FuelLog');

/**
 * Recalculate ALL kmDriven + efficiency for every log of a vehicle.
 *
 * HOW EFFICIENCY IS CALCULATED:
 *
 *   Log 1 (first fill): kmDriven = null, efficiency = null
 *     → We only know the starting odometer; the car hasn't run on this fuel yet.
 *
 *   Log 2 onwards: cumulative average including the current fill
 *     kmDriven  = current odometer − previous odometer  (segment distance)
 *     efficiency = (current odometer − first odometer) ÷ (sum of ALL fills up to and including current)
 *
 * Example: 10L@1000km, 10L@1500km, 10L@2000km, 10L@2500km
 *   Log2: kmDriven=500, efficiency = 500km  / 20L = 25.0 km/L
 *   Log3: kmDriven=500, efficiency = 1000km / 30L = 33.3 km/L
 *   Log4: kmDriven=500, efficiency = 1500km / 40L = 37.5 km/L
 *
 * Call this after ANY fuel log insert/update/delete for that vehicle.
 *
 * @param {string|ObjectId} vehicleId
 */
async function recalcVehicleLogs(vehicleId) {
  const logs = await FuelLog.find({ vehicleId }).sort({ filledAt: 1, createdAt: 1 }).lean();
  const bulkOps = [];

  for (let i = 0; i < logs.length; i++) {
    const curr = logs[i];
    const prev = i > 0 ? logs[i - 1] : null;
    let kmDriven = null;
    let efficiency = null;

    if (prev && prev.odometer != null && curr.odometer != null) {
      const segKm = curr.odometer - prev.odometer;
      if (segKm > 0) {
        kmDriven = parseFloat(segKm.toFixed(2));

        const firstOdo  = logs[0].odometer;
        const totalKm   = curr.odometer - firstOdo;
        const totalFuel = logs.slice(0, i + 1).reduce((s, l) => s + (l.litres || 0), 0);

        if (totalKm > 0 && totalFuel > 0) {
          efficiency = parseFloat((totalKm / totalFuel).toFixed(4));
        }
      }
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: curr._id },
        update: { $set: { kmDriven, efficiency } },
      },
    });
  }

  if (bulkOps.length) await FuelLog.bulkWrite(bulkOps);
}

module.exports = { recalcVehicleLogs };
