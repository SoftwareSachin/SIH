import { db } from "./db";
import { roles, users, userRoleAssignments } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface RoleDefinition {
  name: 'admin' | 'state' | 'district' | 'field' | 'ngo' | 'public';
  displayName: string;
  description: string;
  permissions: string[];
  canAccessStates?: string[];
  canAccessDistricts?: string[];
}

// Define the 6 roles based on the RBAC specification
export const RBAC_ROLES: RoleDefinition[] = [
  {
    name: 'admin',
    displayName: 'System Administrator',
    description: 'Full system control, user management, config, data & model governance.',
    permissions: [
      'view_all_claims',
      'approve_claims', 
      'reject_claims',
      'upload_documents',
      'verify_documents',
      'manage_users',
      'manage_system_settings',
      'view_public_maps',
      'export_data',
      'generate_reports',
      'access_admin_panel',
      'access_ai_processing',
      'access_dss_engine',
      'manage_roles',
      'manage_api_keys',
      'view_audit_logs',
      'hard_delete_data',
      'restore_data',
      'configure_rbac',
      'manage_basemaps',
      'upload_baseline_datasets',
      'manage_model_versions',
      'view_all_pii'
    ]
  },
  {
    name: 'state',
    displayName: 'State Officer',
    description: 'Oversee FRA progress and data quality at state level; approve district-level decisions.',
    permissions: [
      'view_state_claims',
      'approve_claims',
      'reject_claims',
      'upload_documents',
      'verify_documents',
      'view_public_maps',
      'export_data',
      'generate_reports',
      'access_dss_engine',
      'approve_district_escalations',
      'request_field_verifications',
      'assign_district_tasks',
      'upload_state_datasets',
      'view_model_results',
      'flag_model_issues',
      'view_pii_with_restrictions',
      'run_state_dss'
    ]
  },
  {
    name: 'district',
    displayName: 'District Officer',
    description: 'Day-to-day verification and approvals for claims inside their district.',
    permissions: [
      'view_district_claims',
      'approve_claims',
      'reject_claims',
      'upload_documents',
      'verify_documents',
      'view_public_maps',
      'export_data',
      'generate_reports',
      'access_dss_engine',
      'assign_field_officers',
      'track_verification_status',
      'add_officer_notes',
      'request_reinspection',
      'run_district_dss',
      'view_pii_for_verification'
    ]
  },
  {
    name: 'field',
    displayName: 'Field Officer',
    description: 'Mobile-first field verification, document collection, and on-ground linking.',
    permissions: [
      'upload_documents',
      'verify_documents',
      'view_public_maps',
      'create_claim_records',
      'capture_field_data',
      'capture_photos_gps',
      'capture_consent_forms',
      'edit_extracted_fields',
      'update_claim_status',
      'work_offline_sync',
      'mark_verification_checklist',
      'view_assigned_claims',
      'select_village_polygon',
      'pin_homestead_location',
      'view_limited_pii'
    ]
  },
  {
    name: 'ngo',
    displayName: 'NGO Partner',
    description: 'Support claimants, submit supporting evidence, and suggest interventions.',
    permissions: [
      'upload_documents',
      'view_public_maps',
      'register_supporting_documents',
      'propose_interventions',
      'upload_community_reports',
      'view_aggregated_dashboards',
      'request_field_verification',
      'track_verification_requests',
      'view_approved_geographies',
      'view_pii_with_consent'
    ]
  },
  {
    name: 'public',
    displayName: 'Public Viewer',
    description: 'Transparent public access to aggregated FRA outcomes (no sensitive PII).',
    permissions: [
      'view_public_maps',
      'browse_fra_atlas',
      'search_district_village',
      'view_aggregated_stats',
      'download_public_datasets'
    ]
  }
];

export async function seedRoles() {
  console.log('🌱 Seeding RBAC roles...');
  
  try {
    // Check if roles already exist
    const existingRoles = await db.select().from(roles);
    
    if (existingRoles.length > 0) {
      console.log('✅ Roles already exist. Updating existing roles...');
      
      // Update existing roles with new permissions
      for (const roleData of RBAC_ROLES) {
        const existingRole = existingRoles.find(r => r.name === roleData.name);
        
        if (existingRole) {
          await db
            .update(roles)
            .set({
              displayName: roleData.displayName,
              description: roleData.description,
              permissions: roleData.permissions,
              canAccessStates: roleData.canAccessStates || null,
              canAccessDistricts: roleData.canAccessDistricts || null,
              updatedAt: new Date()
            })
            .where(eq(roles.id, existingRole.id));
          
          console.log(`✅ Updated role: ${roleData.displayName}`);
        } else {
          // Create new role if it doesn't exist
          await db.insert(roles).values({
            name: roleData.name,
            displayName: roleData.displayName,
            description: roleData.description,
            permissions: roleData.permissions,
            canAccessStates: roleData.canAccessStates || null,
            canAccessDistricts: roleData.canAccessDistricts || null,
            isActive: true
          });
          
          console.log(`✅ Created new role: ${roleData.displayName}`);
        }
      }
    } else {
      // Create all roles from scratch
      for (const roleData of RBAC_ROLES) {
        await db.insert(roles).values({
          name: roleData.name,
          displayName: roleData.displayName,
          description: roleData.description,
          permissions: roleData.permissions,
          canAccessStates: roleData.canAccessStates || null,
          canAccessDistricts: roleData.canAccessDistricts || null,
          isActive: true
        });
        
        console.log(`✅ Created role: ${roleData.displayName}`);
      }
    }
    
    console.log('🎉 Role seeding completed successfully!');
    
    // Display summary
    const finalRoles = await db.select().from(roles);
    console.log(`\n📊 Total roles configured: ${finalRoles.length}`);
    finalRoles.forEach(role => {
      console.log(`   - ${role.displayName} (${role.name}): ${(role.permissions as string[]).length} permissions`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding roles:', error);
    throw error;
  }
}

export async function createDefaultAdmin(email: string = 'admin@fraatlas.gov') {
  console.log('👑 Creating default admin user...');
  
  try {
    // Check if admin user already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (existingAdmin.length > 0) {
      console.log('✅ Admin user already exists:', email);
      
      // Ensure admin has admin role assignment
      const adminRole = await db
        .select()
        .from(roles)
        .where(eq(roles.name, 'admin'))
        .limit(1);
      
      if (adminRole.length > 0) {
        const existingAssignment = await db
          .select()
          .from(userRoleAssignments)
          .where(eq(userRoleAssignments.userId, existingAdmin[0].id))
          .limit(1);
        
        if (existingAssignment.length === 0) {
          await db.insert(userRoleAssignments).values({
            userId: existingAdmin[0].id,
            roleId: adminRole[0].id,
            isActive: true,
            notes: 'Default admin role assignment'
          });
          console.log('✅ Assigned admin role to existing user');
        }
      }
      
      return existingAdmin[0];
    }
    
    // Create new admin user
    const [newAdmin] = await db.insert(users).values({
      email,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin'
    }).returning();
    
    // Assign admin role
    const adminRole = await db
      .select()
      .from(roles)
      .where(eq(roles.name, 'admin'))
      .limit(1);
    
    if (adminRole.length > 0) {
      await db.insert(userRoleAssignments).values({
        userId: newAdmin.id,
        roleId: adminRole[0].id,
        isActive: true,
        notes: 'Default admin role assignment'
      });
    }
    
    console.log('✅ Created default admin user:', email);
    return newAdmin;
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  }
}

// Main seed function
export async function initializeRBAC() {
  console.log('🚀 Initializing RBAC system...');
  
  try {
    await seedRoles();
    await createDefaultAdmin();
    
    console.log('\n🎉 RBAC system initialized successfully!');
    console.log('📋 Next steps:');
    console.log('   1. Users can now register and be assigned appropriate roles');
    console.log('   2. Admin can manage user role assignments');
    console.log('   3. Role-based access control is active across the system');
    
  } catch (error) {
    console.error('❌ Failed to initialize RBAC system:', error);
    throw error;
  }
}

// Run if called directly
console.log('🚀 Starting RBAC initialization...');
initializeRBAC()
  .then(() => {
    console.log('✅ RBAC initialization completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ RBAC initialization failed:', error);
    process.exit(1);
  });