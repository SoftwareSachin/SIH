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

// Land Use Layer Data
export const forestCoverData = [
  {
    id: "forest_001",
    name: "Berasia Reserved Forest",
    type: "forest",
    coordinates: { lat: 23.6450, lng: 77.4200 },
    area: 1200, // hectares
    density: "dense",
    treeSpecies: ["Teak", "Sal", "Mahua"],
    establishedYear: 1955
  },
  {
    id: "forest_002", 
    name: "Obedullaganja Community Forest",
    type: "forest",
    coordinates: { lat: 23.0300, lng: 77.2100 },
    area: 850,
    density: "medium",
    treeSpecies: ["Bamboo", "Teak", "Neem"],
    establishedYear: 1972
  },
  {
    id: "forest_003",
    name: "Koraput Reserved Forest",
    type: "forest", 
    coordinates: { lat: 18.8100, lng: 82.7200 },
    area: 2100,
    density: "dense",
    treeSpecies: ["Sal", "Bamboo", "Mahua"],
    establishedYear: 1960
  },
  {
    id: "forest_004",
    name: "Rayagada Forest Block",
    type: "forest",
    coordinates: { lat: 19.1650, lng: 83.4150 },
    area: 950,
    density: "medium", 
    treeSpecies: ["Teak", "Sal", "Eucalyptus"],
    establishedYear: 1968
  },
  {
    id: "forest_005",
    name: "Mancherial Forest Reserve",
    type: "forest",
    coordinates: { lat: 18.8750, lng: 79.4550 },
    area: 1400,
    density: "dense",
    treeSpecies: ["Teak", "Bamboo", "Neem"],
    establishedYear: 1963
  }
];

export const waterBodiesData = [
  {
    id: "water_001",
    name: "Berasia Lake",
    type: "lake",
    coordinates: { lat: 23.6280, lng: 77.4280 },
    area: 45, // hectares
    waterType: "freshwater",
    depth: 12, // meters
    fishSpecies: ["Rohu", "Catla", "Mrigal"]
  },
  {
    id: "water_002",
    name: "Obedullaganja Pond",
    type: "pond",
    coordinates: { lat: 23.0400, lng: 77.2200 },
    area: 8,
    waterType: "freshwater", 
    depth: 4,
    fishSpecies: ["Rohu", "Catla"]
  },
  {
    id: "water_003",
    name: "Koraput Reservoir",
    type: "reservoir",
    coordinates: { lat: 18.8050, lng: 82.7150 },
    area: 120,
    waterType: "freshwater",
    depth: 25,
    fishSpecies: ["Rohu", "Catla", "Mrigal", "Carp"]
  },
  {
    id: "water_004",
    name: "Mancherial Stream",
    type: "stream",
    coordinates: { lat: 18.8700, lng: 79.4600 },
    area: 15,
    waterType: "freshwater",
    depth: 3,
    fishSpecies: ["Small fish varieties"]
  }
];

export const agriculturalLandData = [
  {
    id: "agri_001",
    name: "Berasia Agricultural Area",
    type: "agricultural_land",
    coordinates: { lat: 23.6200, lng: 77.4400 },
    area: 280, // hectares
    cropType: "Rice",
    soilType: "Alluvial",
    irrigationType: "Canal",
    farmingMethod: "Traditional"
  },
  {
    id: "agri_002", 
    name: "Phanda Crop Fields",
    type: "agricultural_land",
    coordinates: { lat: 23.5180, lng: 77.5620 },
    area: 195,
    cropType: "Wheat",
    soilType: "Black",
    irrigationType: "Borewell",
    farmingMethod: "Modern"
  },
  {
    id: "agri_003",
    name: "Koraput Paddy Fields",
    type: "agricultural_land",
    coordinates: { lat: 18.8200, lng: 82.7300 },
    area: 340,
    cropType: "Paddy",
    soilType: "Clay",
    irrigationType: "Rainwater",
    farmingMethod: "Traditional"
  },
  {
    id: "agri_004",
    name: "Rayagada Cotton Fields",
    type: "agricultural_land",
    coordinates: { lat: 19.1700, lng: 83.4200 },
    area: 220,
    cropType: "Cotton",
    soilType: "Red",
    irrigationType: "Drip",
    farmingMethod: "Modern"
  },
  {
    id: "agri_005",
    name: "Mancherial Rice Fields",
    type: "agricultural_land",
    coordinates: { lat: 18.8800, lng: 79.4500 },
    area: 310,
    cropType: "Rice",
    soilType: "Alluvial",
    irrigationType: "Canal",
    farmingMethod: "Traditional"
  }
];

export const urbanAreasData = [
  {
    id: "urban_001",
    name: "Berasia Town Center",
    type: "urban_area",
    coordinates: { lat: 23.6333, lng: 77.4333 },
    area: 85, // hectares
    population: 28000,
    urbanType: "Town",
    amenities: ["Market", "School", "Hospital", "Bank"]
  },
  {
    id: "urban_002",
    name: "Islamnagar Settlement",
    type: "urban_area", 
    coordinates: { lat: 23.1678, lng: 77.4890 },
    area: 42,
    population: 15000,
    urbanType: "Settlement",
    amenities: ["Market", "School", "Primary Health Center"]
  },
  {
    id: "urban_003",
    name: "Koraput Urban Area",
    type: "urban_area",
    coordinates: { lat: 18.8107, lng: 82.7200 },
    area: 120,
    population: 45000,
    urbanType: "City",
    amenities: ["Market", "Hospital", "College", "Bank", "Police Station"]
  }
];

// Infrastructure Layer Data
export const roadsData = [
  {
    id: "road_001",
    name: "NH-46 Bhopal-Berasia Highway",
    type: "highway",
    coordinates: { lat: 23.6100, lng: 77.4100 },
    length: 35, // kilometers
    width: 8, // meters
    roadType: "National Highway",
    condition: "Good"
  },
  {
    id: "road_002",
    name: "State Highway Obedullaganja-Phanda",
    type: "state_highway",
    coordinates: { lat: 23.2850, lng: 77.3950 },
    length: 22,
    width: 6,
    roadType: "State Highway", 
    condition: "Fair"
  },
  {
    id: "road_003",
    name: "Koraput-Rayagada Road",
    type: "district_road",
    coordinates: { lat: 18.9880, lng: 83.0675 },
    length: 45,
    width: 5,
    roadType: "District Road",
    condition: "Good"
  }
];

export const railwaysData = [
  {
    id: "rail_001",
    name: "Bhopal-Berasia Rail Line",
    type: "railway",
    coordinates: { lat: 23.5900, lng: 77.4000 },
    length: 28, // kilometers
    gauge: "Broad Gauge",
    electrified: true,
    stations: ["Bhopal Junction", "Berasia"]
  },
  {
    id: "rail_002",
    name: "Koraput-Rayagada Railway",
    type: "railway",
    coordinates: { lat: 18.9500, lng: 83.0500 },
    length: 55,
    gauge: "Broad Gauge",
    electrified: false,
    stations: ["Koraput", "Jeypore", "Rayagada"]
  }
];

export const powerlinesData = [
  {
    id: "power_001",
    name: "Berasia 220KV Transmission Line",
    type: "transmission_line",
    coordinates: { lat: 23.6400, lng: 77.4250 },
    voltage: "220KV",
    length: 15, // kilometers
    capacity: "200MW",
    operator: "MP Power Grid"
  },
  {
    id: "power_002",
    name: "Koraput 132KV Distribution Line",
    type: "distribution_line",
    coordinates: { lat: 18.8000, lng: 82.7100 },
    voltage: "132KV",
    length: 8,
    capacity: "50MW", 
    operator: "OPTCL"
  }
];

export const towersData = [
  {
    id: "tower_001",
    name: "Berasia Mobile Tower",
    type: "communication_tower",
    coordinates: { lat: 23.6350, lng: 77.4320 },
    height: 45, // meters
    operator: "Airtel",
    services: ["2G", "3G", "4G"],
    coverage: "5km radius"
  },
  {
    id: "tower_002",
    name: "Obedullaganja Cell Tower",
    type: "communication_tower",
    coordinates: { lat: 23.0420, lng: 77.2180 },
    height: 35,
    operator: "Jio",
    services: ["3G", "4G", "5G"],
    coverage: "4km radius"
  },
  {
    id: "tower_003",
    name: "Koraput Communication Tower",
    type: "communication_tower",
    coordinates: { lat: 18.8120, lng: 82.7180 },
    height: 50,
    operator: "BSNL",
    services: ["2G", "3G", "4G"],
    coverage: "6km radius"
  }
];

// Default export
export default geoData;