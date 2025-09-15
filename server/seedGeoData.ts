import { db } from "./db";
import { states, districts, villages } from "@shared/schema";
import { eq } from "drizzle-orm";

// Import static data from client
import { STATES } from "../client/src/data/states.js";
import { DISTRICTS } from "../client/src/data/districts.js";
import { VILLAGES_BY_DISTRICT, getAllVillages } from "../client/src/data/villages.js";

// Map old static IDs to new database IDs
const districtIdMap = new Map<string, string>();

export async function seedStates() {
  console.log('🌱 Seeding states data...');
  
  try {
    // Check if states already exist
    const existingStates = await db.select().from(states);
    
    if (existingStates.length > 0) {
      console.log('✅ States already exist. Skipping states seeding...');
      return;
    }

    // Insert all states
    for (const stateData of STATES) {
      await db.insert(states).values({
        id: stateData.id,
        name: stateData.name,
        code: stateData.code
      });
      
      console.log(`✅ Created state: ${stateData.name}`);
    }
    
    console.log('🎉 States seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding states:', error);
    throw error;
  }
}

export async function seedDistricts() {
  console.log('🌱 Seeding districts data...');
  
  try {
    // Check if districts already exist
    const existingDistricts = await db.select().from(districts);
    
    if (existingDistricts.length > 0) {
      console.log('✅ Districts already exist. Loading existing district mappings...');
      // Load existing mappings for villages seeding
      for (const district of existingDistricts) {
        const staticDistrict = DISTRICTS.find(d => d.name === district.name && d.code === district.code);
        if (staticDistrict) {
          districtIdMap.set(staticDistrict.id, district.id);
        }
      }
      return;
    }

    // Filter districts for the four states we want: MP, OR, TG, TR
    const targetStates = ['MP', 'OR', 'TG', 'TR'];
    const targetDistricts = DISTRICTS.filter(district => targetStates.includes(district.stateId));

    // Insert districts and map IDs
    for (const districtData of targetDistricts) {
      const [newDistrict] = await db.insert(districts).values({
        name: districtData.name,
        code: districtData.code,
        stateId: districtData.stateId
      }).returning();
      
      // Map old static ID to new database ID
      districtIdMap.set(districtData.id, newDistrict.id);
      
      console.log(`✅ Created district: ${districtData.name} (${districtData.stateName})`);
    }
    
    console.log('🎉 Districts seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding districts:', error);
    throw error;
  }
}

export async function seedVillages() {
  console.log('🌱 Seeding villages data...');
  
  try {
    // Check if villages already exist
    const existingVillages = await db.select().from(villages);
    
    if (existingVillages.length > 0) {
      console.log('✅ Villages already exist. Skipping villages seeding...');
      return;
    }

    // Get all villages from static data
    const allVillages = getAllVillages();
    
    // Filter villages for the four states we want: MP, OR, TG, TR
    const targetStates = ['MP', 'OR', 'TG', 'TR'];
    const targetVillages = allVillages.filter(village => targetStates.includes(village.stateId));

    // Insert villages using mapped district IDs
    for (const villageData of targetVillages) {
      const mappedDistrictId = districtIdMap.get(villageData.districtId);
      
      if (!mappedDistrictId) {
        console.warn(`⚠️ No mapped district ID found for village ${villageData.name} in district ${villageData.districtName}`);
        continue;
      }

      await db.insert(villages).values({
        name: villageData.name,
        code: villageData.code,
        districtId: mappedDistrictId,
        latitude: villageData.latitude.toString(),
        longitude: villageData.longitude.toString(),
        population: villageData.population,
        tribalPopulation: villageData.tribalPopulation
      });
      
      console.log(`✅ Created village: ${villageData.name} (${villageData.districtName}, ${villageData.stateName})`);
    }
    
    console.log('🎉 Villages seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding villages:', error);
    throw error;
  }
}

// Main seed function for geographical data
export async function initializeGeoData() {
  console.log('🚀 Initializing geographical data...');
  
  try {
    await seedStates();
    await seedDistricts();
    await seedVillages();
    
    console.log('\n🎉 Geographical data initialized successfully!');
    console.log('📋 Summary:');
    
    const statesCount = await db.select().from(states);
    const districtsCount = await db.select().from(districts);
    const villagesCount = await db.select().from(villages);
    
    console.log(`   📍 States: ${statesCount.length}`);
    console.log(`   🏛️  Districts: ${districtsCount.length}`);
    console.log(`   🏘️  Villages: ${villagesCount.length}`);
    
  } catch (error) {
    console.error('❌ Failed to initialize geographical data:', error);
    throw error;
  }
}