// Static villages data - no API calls needed
export interface Village {
  id: string;
  name: string;
  code: string;
  districtId: string;
  districtName: string;
  stateId: string;
  stateName: string;
  latitude: number;
  longitude: number;
  population: number;
  tribalPopulation: number;
}

// Sample of key villages - organized by district for fast lookups
export const VILLAGES_BY_DISTRICT: Record<string, Village[]> = {
  // Bhopal district (MP) - ID: "11b5d559-5a6f-42dd-a0a9-3e8ef75037e4"
  "11b5d559-5a6f-42dd-a0a9-3e8ef75037e4": [
    {
      id: "562b54cb-a21e-4a67-9258-e49ddbea9e4f",
      name: "Berasia",
      code: "BERS",
      districtId: "11b5d559-5a6f-42dd-a0a9-3e8ef75037e4",
      districtName: "Bhopal",
      stateId: "MP",
      stateName: "Madhya Pradesh",
      latitude: 23.6333,
      longitude: 77.4333,
      population: 28000,
      tribalPopulation: 8400
    },
    {
      id: "5cd42810-4f51-4df4-9c9a-9621ca60cdff",
      name: "Berkhedi", 
      code: "BRKH",
      districtId: "11b5d559-5a6f-42dd-a0a9-3e8ef75037e4",
      districtName: "Bhopal",
      stateId: "MP",
      stateName: "Madhya Pradesh",
      latitude: 23.2876,
      longitude: 77.3456,
      population: 8500,
      tribalPopulation: 2550
    },
    {
      id: "d31d7652-b191-4f3c-b88e-fa3141795783",
      name: "Islamnagar",
      code: "ISLM", 
      districtId: "11b5d559-5a6f-42dd-a0a9-3e8ef75037e4",
      districtName: "Bhopal",
      stateId: "MP",
      stateName: "Madhya Pradesh",
      latitude: 23.1678,
      longitude: 77.4890,
      population: 15000,
      tribalPopulation: 4500
    },
    {
      id: "60ff2fa5-fe97-4ff6-a020-29885750b63d",
      name: "Obedullaganja",
      code: "OBDL",
      districtId: "11b5d559-5a6f-42dd-a0a9-3e8ef75037e4", 
      districtName: "Bhopal",
      stateId: "MP",
      stateName: "Madhya Pradesh",
      latitude: 23.0456,
      longitude: 77.2234,
      population: 18000,
      tribalPopulation: 5400
    },
    {
      id: "2bb0ebe2-bccf-480f-b91b-4ea874a11745",
      name: "Phanda",
      code: "PHND",
      districtId: "11b5d559-5a6f-42dd-a0a9-3e8ef75037e4",
      districtName: "Bhopal", 
      stateId: "MP",
      stateName: "Madhya Pradesh",
      latitude: 23.5234,
      longitude: 77.5678,
      population: 12000,
      tribalPopulation: 3600
    }
  ],

  // Gajapati district (OR) - ID: "ced349ac-8d6a-45c3-977e-5bdd930c328d" 
  "ced349ac-8d6a-45c3-977e-5bdd930c328d": [
    {
      id: "aa3f7091-cf9d-4d53-86a9-d8c0ea5fb596",
      name: "Paralakhemundi",
      code: "PRLK",
      districtId: "ced349ac-8d6a-45c3-977e-5bdd930c328d",
      districtName: "Gajapati",
      stateId: "OR",
      stateName: "Odisha",
      latitude: 18.7833,
      longitude: 84.0833,
      population: 52000,
      tribalPopulation: 20800
    },
    {
      id: "9e13aa76-0521-4777-b47e-c962628ce9c1",
      name: "Kashinagar",
      code: "KSNG", 
      districtId: "ced349ac-8d6a-45c3-977e-5bdd930c328d",
      districtName: "Gajapati",
      stateId: "OR",
      stateName: "Odisha",
      latitude: 18.9167,
      longitude: 84.4333,
      population: 18000,
      tribalPopulation: 7200
    },
    {
      id: "5b201ca4-54e4-4422-bb72-458c1dd55a4b",
      name: "Gurandi",
      code: "GRND",
      districtId: "ced349ac-8d6a-45c3-977e-5bdd930c328d",
      districtName: "Gajapati", 
      stateId: "OR",
      stateName: "Odisha",
      latitude: 18.8667,
      longitude: 84.2167,
      population: 12000,
      tribalPopulation: 4800
    },
    {
      id: "e0fedf4a-3fcc-456d-98a2-f6c371d0c16b",
      name: "Rayagada",
      code: "RYGA",
      districtId: "ced349ac-8d6a-45c3-977e-5bdd930c328d",
      districtName: "Gajapati",
      stateId: "OR", 
      stateName: "Odisha",
      latitude: 18.8167,
      longitude: 83.9167,
      population: 15000,
      tribalPopulation: 6000
    },
    {
      id: "ddbbea62-338c-4dea-9d82-e8dc1e89337f",
      name: "Mohana",
      code: "MOHN",
      districtId: "ced349ac-8d6a-45c3-977e-5bdd930c328d",
      districtName: "Gajapati",
      stateId: "OR",
      stateName: "Odisha",
      latitude: 18.9333,
      longitude: 84.1667,
      population: 8500,
      tribalPopulation: 3400
    }
  ],

  // Indore district (MP) - ID: "9bf4e8f4-ed5d-4f7a-bcd9-37bb50cd472d"
  "9bf4e8f4-ed5d-4f7a-bcd9-37bb50cd472d": [
    {
      id: "ind-mhow-001",
      name: "Mhow",
      code: "MHOW", 
      districtId: "9bf4e8f4-ed5d-4f7a-bcd9-37bb50cd472d",
      districtName: "Indore",
      stateId: "MP",
      stateName: "Madhya Pradesh",
      latitude: 22.5500,
      longitude: 75.7667,
      population: 85000,
      tribalPopulation: 17000
    },
    {
      id: "ind-depl-001",
      name: "Depalpur",
      code: "DEPL",
      districtId: "9bf4e8f4-ed5d-4f7a-bcd9-37bb50cd472d",
      districtName: "Indore",
      stateId: "MP",
      stateName: "Madhya Pradesh",
      latitude: 22.8500,
      longitude: 75.5500,
      population: 28000,
      tribalPopulation: 5600
    },
    {
      id: "ind-snwr-001", 
      name: "Sanwer",
      code: "SNWR",
      districtId: "9bf4e8f4-ed5d-4f7a-bcd9-37bb50cd472d",
      districtName: "Indore",
      stateId: "MP",
      stateName: "Madhya Pradesh",
      latitude: 22.9500,
      longitude: 75.8500,
      population: 35000,
      tribalPopulation: 7000
    },
    {
      id: "ind-gtmp-001",
      name: "Gautampura",
      code: "GTMP",
      districtId: "9bf4e8f4-ed5d-4f7a-bcd9-37bb50cd472d",
      districtName: "Indore",
      stateId: "MP",
      stateName: "Madhya Pradesh",
      latitude: 22.4876,
      longitude: 75.6234,
      population: 22000,
      tribalPopulation: 4400
    }
  ],

  // Hyderabad district (TG) - ID: "980300d6-2ae0-46dc-b375-b5c9a54c7754"
  "980300d6-2ae0-46dc-b375-b5c9a54c7754": [
    {
      id: "hyd-rjnd-001",
      name: "Rajendranagar", 
      code: "RJND",
      districtId: "980300d6-2ae0-46dc-b375-b5c9a54c7754",
      districtName: "Hyderabad",
      stateId: "TG",
      stateName: "Telangana",
      latitude: 17.3616,
      longitude: 78.4100,
      population: 95000,
      tribalPopulation: 9500
    },
    {
      id: "hyd-shnk-001",
      name: "Shankarpally",
      code: "SHNK",
      districtId: "980300d6-2ae0-46dc-b375-b5c9a54c7754",
      districtName: "Hyderabad",
      stateId: "TG", 
      stateName: "Telangana",
      latitude: 17.4500,
      longitude: 78.1200,
      population: 22000,
      tribalPopulation: 2200
    }
  ],

  // Dhalai district (TR) - ID: "c2a7ab4e-eb4e-43e3-9aa6-a27c1ec46bc8"
  "c2a7ab4e-eb4e-43e3-9aa6-a27c1ec46bc8": [
    {
      id: "dh-ambs-001",
      name: "Ambassa",
      code: "AMBS",
      districtId: "c2a7ab4e-eb4e-43e3-9aa6-a27c1ec46bc8",
      districtName: "Dhalai",
      stateId: "TR",
      stateName: "Tripura",
      latitude: 23.9167,
      longitude: 91.8500,
      population: 12500,
      tribalPopulation: 4875
    },
    {
      id: "dh-manu-001",
      name: "Manu",
      code: "MANU",
      districtId: "c2a7ab4e-eb4e-43e3-9aa6-a27c1ec46bc8",
      districtName: "Dhalai",
      stateId: "TR",
      stateName: "Tripura",
      latitude: 24.0234,
      longitude: 91.7890,
      population: 2800,
      tribalPopulation: 1092
    },
    {
      id: "dh-lgth-001",
      name: "Longtharai",
      code: "LGTH", 
      districtId: "c2a7ab4e-eb4e-43e3-9aa6-a27c1ec46bc8",
      districtName: "Dhalai",
      stateId: "TR",
      stateName: "Tripura",
      latitude: 23.8567,
      longitude: 91.9234,
      population: 1900,
      tribalPopulation: 741
    }
  ],

  // Shahdol district (MP) - ID: "de8220a9-7b93-4b15-8211-72f4b67469b6"
  "de8220a9-7b93-4b15-8211-72f4b67469b6": [
    {
      id: "vill-bamhni",
      name: "Bamhni",
      code: "BAMH",
      districtId: "de8220a9-7b93-4b15-8211-72f4b67469b6",
      districtName: "Shahdol",
      stateId: "MP",
      stateName: "Madhya Pradesh",
      latitude: 23.4734,
      longitude: 81.1409,
      population: 8500,
      tribalPopulation: 4200
    },
    {
      id: "vill-beohari",
      name: "Beohari",
      code: "BEOH",
      districtId: "de8220a9-7b93-4b15-8211-72f4b67469b6",
      districtName: "Shahdol",
      stateId: "MP",
      stateName: "Madhya Pradesh",
      latitude: 23.6333,
      longitude: 81.3667,
      population: 12000,
      tribalPopulation: 6000
    },
    {
      id: "vill-burhar",
      name: "Burhar",
      code: "BURH",
      districtId: "de8220a9-7b93-4b15-8211-72f4b67469b6",
      districtName: "Shahdol",
      stateId: "MP",
      stateName: "Madhya Pradesh",
      latitude: 23.2167,
      longitude: 81.5333,
      population: 15000,
      tribalPopulation: 7500
    },
    {
      id: "vill-jaisinghnagar",
      name: "Jaisinghnagar",
      code: "JSGR",
      districtId: "de8220a9-7b93-4b15-8211-72f4b67469b6",
      districtName: "Shahdol",
      stateId: "MP",
      stateName: "Madhya Pradesh",
      latitude: 23.1167,
      longitude: 80.9500,
      population: 9800,
      tribalPopulation: 4900
    },
    {
      id: "vill-sohagpur",
      name: "Sohagpur",
      code: "SOHG",
      districtId: "de8220a9-7b93-4b15-8211-72f4b67469b6",
      districtName: "Shahdol",
      stateId: "MP",
      stateName: "Madhya Pradesh",
      latitude: 23.4000,
      longitude: 81.6667,
      population: 11200,
      tribalPopulation: 5600
    }
  ]
};

// Helper function to get villages by district ID
export const getVillagesByDistrictId = (districtId: string): Village[] => {
  return VILLAGES_BY_DISTRICT[districtId] || [];
};

// Helper function to get village by ID (across all districts)
export const getVillageById = (id: string): Village | undefined => {
  for (const villages of Object.values(VILLAGES_BY_DISTRICT)) {
    const village = villages.find(v => v.id === id);
    if (village) return village;
  }
  return undefined;
};

// Get all villages as flat array
export const getAllVillages = (): Village[] => {
  return Object.values(VILLAGES_BY_DISTRICT).flat();
};

// Check if district has villages
export const hasVillages = (districtId: string): boolean => {
  return !!VILLAGES_BY_DISTRICT[districtId] && VILLAGES_BY_DISTRICT[districtId].length > 0;
};