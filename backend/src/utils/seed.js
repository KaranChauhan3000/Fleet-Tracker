require('dotenv').config();
const mongoose = require('mongoose');
const { Company, Admin, User, Vehicle, FuelLog } = require('../models');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fleetpro');
  console.log('✅ Connected to MongoDB');

  await Promise.all([
    Company.deleteMany({}), Admin.deleteMany({}),
    User.deleteMany({}), Vehicle.deleteMany({}), FuelLog.deleteMany({}),
  ]);
  console.log('🗑  Cleared existing data');

  const company1 = await Company.create({ name: 'Northern Fleet Division', slug: 'north', createdBy: 'superadmin' });
  const company2 = await Company.create({ name: 'Southern Fleet Division', slug: 'south', createdBy: 'superadmin' });
  console.log('🏢  Created companies: north, south');

  await Admin.create({
    name: 'Vikram Singh', email: 'vikram.singh@northfleet.in', phone: '9810011001',
    designation: 'Fleet Manager', companyId: company1._id, createdBy: 'superadmin',
  });
  await Admin.create({
    name: 'Meena Rajan', email: 'meena.rajan@southfleet.in', phone: '9840022002',
    designation: 'Operations Head', companyId: company2._id, createdBy: 'superadmin',
  });
  console.log('👤  Created admins');

  const users = await User.create([
    { name: 'Ravi Shankar Yadav', employeeId: 'NF001', phone: '9711100001', licenseNumber: 'DL01-20190012345', companyId: company1._id },
    { name: 'Deepak Choudhary',   employeeId: 'NF002', phone: '9711100002', licenseNumber: 'DL01-20180054321', companyId: company1._id },
    { name: 'Santosh Kumar',      employeeId: 'NF003', phone: '9711100003', licenseNumber: 'UP32-20200098765', companyId: company1._id },
    { name: 'Murugan Pillai',     employeeId: 'SF001', phone: '9841100001', licenseNumber: 'TN07-20170067890', companyId: company2._id },
    { name: 'Karthik Reddy',      employeeId: 'SF002', phone: '9841100002', licenseNumber: 'AP09-20190034567', companyId: company2._id },
    { name: 'Suresh Babu',        employeeId: 'SF003', phone: '9841100003', licenseNumber: 'KA05-20210012378', companyId: company2._id },
  ]);
  console.log('👥  Created users');

  const vehicles = await Vehicle.create([
    { plateNumber: 'DL01CA0001', make: 'Tata',          model: '407 Gold',  year: 2021, fuelType: 'Diesel', status: 'active',      companyId: company1._id, assignedUserId: users[0]._id },
    { plateNumber: 'DL01CA0002', make: 'Ashok Leyland', model: 'Dost+',     year: 2020, fuelType: 'Diesel', status: 'active',      companyId: company1._id, assignedUserId: users[1]._id },
    { plateNumber: 'UP32CB0003', make: 'Mahindra',      model: 'Jeeto',     year: 2022, fuelType: 'CNG',    status: 'maintenance', companyId: company1._id, assignedUserId: users[2]._id },
    { plateNumber: 'TN07DE0004', make: 'Tata',          model: 'LPT 1109',  year: 2021, fuelType: 'Diesel', status: 'active',      companyId: company2._id, assignedUserId: users[3]._id },
    { plateNumber: 'AP09EF0005', make: 'Eicher',        model: '10.90',     year: 2019, fuelType: 'Diesel', status: 'active',      companyId: company2._id, assignedUserId: users[4]._id },
    { plateNumber: 'KA05GH0006', make: 'Mahindra',      model: 'Supro',     year: 2023, fuelType: 'Petrol', status: 'inactive',    companyId: company2._id, assignedUserId: users[5]._id },
  ]);

  for (let i = 0; i < 6; i++) {
    await User.findByIdAndUpdate(users[i]._id, {
      assignedVehicleId: vehicles[i]._id,
      assignedVehicleIds: [vehicles[i]._id],
    });
  }
  console.log('🚗  Created vehicles');

  const stations = ['HP Petrol Pump', 'BPCL Station', 'Indian Oil', 'Reliance Fuel', 'Bharat Petroleum'];
  const now = new Date();
  const logs = [];

  for (let v = 0; v < 6; v++) {
    let odometer = 38000 + Math.floor(Math.random() * 25000);
    const vehicleId = vehicles[v]._id;
    const userId    = users[v]._id;
    const companyId = v < 3 ? company1._id : company2._id;
    const isCNG     = vehicles[v].fuelType === 'CNG';
    const isPetrol  = vehicles[v].fuelType === 'Petrol';

    for (let daysAgo = 88; daysAgo >= 0; daysAgo -= Math.floor(Math.random() * 6 + 3)) {
      const km           = Math.floor(Math.random() * 450 + 80);
      odometer          += km;
      const litres       = parseFloat((km / (Math.random() * 3 + 10)).toFixed(2));
      const baseRate     = isCNG ? 78 : isPetrol ? 102 : 92;
      const costPerLitre = parseFloat((baseRate + Math.random() * 5).toFixed(2));
      const fillDate     = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
      logs.push({
        vehicleId, userId, companyId,
        litres, costPerLitre,
        totalCost:   parseFloat((litres * costPerLitre).toFixed(2)),
        odometer,
        kmDriven:    km,
        efficiency:  parseFloat((litres / km * 100).toFixed(4)),
        fuelType:    vehicles[v].fuelType,
        fuelStation: stations[Math.floor(Math.random() * stations.length)],
        filledAt:    fillDate,
      });
    }
  }

  await FuelLog.insertMany(logs);
  console.log(`⛽  Created ${logs.length} fuel log entries`);

  console.log('\n✅  Seed complete!\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Super Admin Login:');
  console.log('  URL      : http://localhost:8000/superadmin');
  console.log('  Username : superadmin');
  console.log('  Password : SuperAdmin@2024!');
  console.log('');
  console.log('  Admin Logins (OTP shown on Super Admin dashboard):');
  console.log('  North : http://localhost:8000/admin?company=north  →  phone 9810011001');
  console.log('  South : http://localhost:8000/admin?company=south  →  phone 9840022002');
  console.log('');
  console.log('  User Logins (Employee ID only, no password):');
  console.log('  North : http://localhost:8000/?company=north');
  console.log('    NF001  NF002  NF003');
  console.log('  South : http://localhost:8000/?company=south');
  console.log('    SF001  SF002  SF003');
  console.log('═══════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
