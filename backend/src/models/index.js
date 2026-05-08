// Central re-export — import from here or directly from individual model files
module.exports = {
  Company:        require('./Company'),
  Admin:          require('./Admin'),
  User:           require('./User'),
  Vehicle:        require('./Vehicle'),
  FuelLog:        require('./FuelLog'),
  OtpRequest:     require('./OtpRequest'),
  Challan:        require('./Challan'),
  ServiceLog:     require('./ServiceLog'),
  VehicleFinance:   require('./VehicleFinance'),
  InsurancePolicy:  require('./InsurancePolicy'),
};
