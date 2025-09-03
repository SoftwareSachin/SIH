// Main geographic data file - replaces all API calls
import { STATES, State, getStateById, getStateByName } from './states';
import { DISTRICTS, District, getDistrictsByStateId, getDistrictById } from './districts';
import { VILLAGES_BY_DISTRICT, Village, getVillagesByDistrictId, getVillageById, getAllVillages, hasVillages } from './villages';

// Re-export types
export type { State, District, Village };

// Main data exports
export { STATES, DISTRICTS, VILLAGES_BY_DISTRICT };

// Geographic data helper functions
export const geoData = {
  // State functions
  getStates: (): State[] => STATES,
  getStateById,
  getStateByName,
  
  // District functions
  getDistrictsByState: (stateId: string): District[] => getDistrictsByStateId(stateId),
  getDistrictById,
  getAllDistricts: (): District[] => DISTRICTS,
  
  // Village functions
  getVillagesByDistrict: (districtId: string): Village[] => getVillagesByDistrictId(districtId),
  getVillageById,
  getAllVillages,
  hasVillages,
  
  // Statistics
  getStats: () => ({
    totalStates: STATES.length,
    totalDistricts: DISTRICTS.length,
    totalVillages: getAllVillages().length,
    districtCoverage: Object.keys(VILLAGES_BY_DISTRICT).length
  })
};

// Default export
export default geoData;