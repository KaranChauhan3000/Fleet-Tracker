const FuelLog = require('../models/FuelLog');

/**
 * Recalculate ALL kmDriven + efficiency for every log of a vehicle.
 *
 * HOW EFFICIENCY IS CALCULATED:
 *
 *   The latest fill has NOT been burned yet — the car will use that fuel
 *   in the future. So we exclude the current (latest) fill from the
 *   denominator and only count fills that have actually been consumed.
 *
 *   Log 1 (first fill): kmDriven = null, efficiency = null
 *     → Starting reference point only; nothing burned yet.
 *
 *   Log 2: kmDriven = odo[1] - odo[0], efficiency = null
 *     → Only 1 fill (log[0]) has been burned to cover this distance,
 *       but we need at least 2 fills to have a meaningful "previous"
 *       fuel consumed. Efficiency shown from log 3 onwards.
 *
 *   Log 3 onwards (i >= 2):
 *     kmDriven  = current odometer − previous odometer  (segment distance)
 *     efficiency = (current odometer − first odometer)
 *                  ÷ sum of litres from log[0] to log[i-1]
 *                    (all fills EXCEPT the current one, which isn't burned yet)
 *
 * Example: 10L@1000km, 10L@1500km, 10L@2000km, 10L@2500km
 *   Log1: kmDriven=null,  efficiency=null   (reference)
 *   Log2: kmDriven=500,   efficiency=null   (only 1 prior fill, need 2+ for avg)
 *   Log3: kmDriven=500,   efficiency=(2000-1000)/(10+10)=1000/20=50.0 km/L
 *   Log4: kmDriven=500,   efficiency=(2500-1000)/(10+10+10)=1500/30=50.0 km/L
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

        // Efficiency: distance from first odo to current odo,
        // divided by ALL litres EXCEPT the current fill (not burned yet).
        // Requires at least 2 prior fills (i >= 2) for a meaningful average.
        if (i >= 2) {
          const firstOdo  = logs[0].odometer;
          const totalKm   = curr.odometer - firstOdo;
          // Sum litres of logs[0] through logs[i-1] — exclude current fill
          const totalFuel = logs.slice(0, i).reduce((s, l) => s + (l.litres || 0), 0);

          if (totalKm > 0 && totalFuel > 0) {
            efficiency = parseFloat((totalKm / totalFuel).toFixed(4));
          }
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
