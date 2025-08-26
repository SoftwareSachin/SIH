import { storage } from '../storage';

interface SchemeRecommendation {
  schemeId: string;
  schemeName: string;
  priority: 'high' | 'medium' | 'low';
  eligibilityScore: number;
  estimatedBenefit: number;
  rationale: string;
  requirements: string[];
}

interface VillageRecommendation {
  villageId: string;
  villageName: string;
  recommendations: SchemeRecommendation[];
  totalBenefit: number;
  priorityLevel: string;
}

class DSSEngine {
  private schemes = [
    {
      id: 'pm-kisan',
      name: 'PM-KISAN',
      code: 'PM_KISAN',
      description: 'Direct income support to farmer families',
      eligibilityCriteria: {
        landOwnership: true,
        maxLandSize: 10,
        annualIncome: 200000
      },
      benefits: {
        amount: 6000,
        frequency: 'annual',
        installments: 3
      }
    },
    {
      id: 'jal-jeevan-mission',
      name: 'Jal Jeevan Mission',
      code: 'JJM',
      description: 'Providing functional household tap connections',
      eligibilityCriteria: {
        waterAccess: false,
        ruralArea: true
      },
      benefits: {
        tapConnection: true,
        estimatedCost: 35000
      }
    },
    {
      id: 'mgnrega',
      name: 'MGNREGA',
      code: 'MGNREGA',
      description: 'Employment guarantee scheme',
      eligibilityCriteria: {
        ruralArea: true,
        adultMembers: true
      },
      benefits: {
        guaranteedDays: 100,
        wageRate: 250
      }
    },
    {
      id: 'dajgua',
      name: 'DAJGUA (Development Action Janjatiya Gram Utthaan Abhiyan)',
      code: 'DAJGUA',
      description: 'Comprehensive development of tribal areas',
      eligibilityCriteria: {
        tribalArea: true,
        tribalPopulation: 50
      },
      benefits: {
        infrastructureDevelopment: true,
        skillDevelopment: true,
        healthcareAccess: true
      }
    }
  ];

  async generateRecommendations(claimId: string): Promise<SchemeRecommendation[]> {
    try {
      const claim = await storage.getClaimById(claimId);
      if (!claim) {
        throw new Error('Claim not found');
      }

      const village = await storage.getVillageById(claim.villageId!);
      if (!village) {
        throw new Error('Village not found');
      }

      const recommendations: SchemeRecommendation[] = [];

      for (const scheme of this.schemes) {
        const eligibility = this.calculateEligibility(claim, village, scheme);
        
        if (eligibility.score > 50) {
          recommendations.push({
            schemeId: scheme.id,
            schemeName: scheme.name,
            priority: this.determinePriority(eligibility.score),
            eligibilityScore: eligibility.score,
            estimatedBenefit: eligibility.benefit,
            rationale: eligibility.rationale,
            requirements: eligibility.requirements
          });
        }
      }

      // Save recommendations to database
      for (const rec of recommendations) {
        await storage.createRecommendation({
          claimId,
          schemeId: rec.schemeId,
          priority: rec.priority,
          eligibilityScore: rec.eligibilityScore,
          estimatedBenefit: rec.estimatedBenefit,
          rationale: rec.rationale,
          generatedAt: new Date(),
        });
      }

      return recommendations.sort((a, b) => b.eligibilityScore - a.eligibilityScore);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  async generateVillageRecommendations(villageId: string): Promise<VillageRecommendation> {
    try {
      const village = await storage.getVillageById(villageId);
      if (!village) {
        throw new Error('Village not found');
      }

      const claims = await storage.getClaimsByVillage(villageId);
      const allRecommendations: SchemeRecommendation[] = [];

      // Generate recommendations for all claims in the village
      for (const claim of claims) {
        const claimRecommendations = await this.generateRecommendations(claim.id);
        allRecommendations.push(...claimRecommendations);
      }

      // Aggregate and prioritize at village level
      const schemeMap = new Map<string, SchemeRecommendation>();
      
      for (const rec of allRecommendations) {
        const existing = schemeMap.get(rec.schemeId);
        if (!existing || rec.eligibilityScore > existing.eligibilityScore) {
          schemeMap.set(rec.schemeId, rec);
        }
      }

      const villageRecommendations = Array.from(schemeMap.values());
      const totalBenefit = villageRecommendations.reduce((sum, rec) => sum + rec.estimatedBenefit, 0);
      
      const highPriorityCount = villageRecommendations.filter(r => r.priority === 'high').length;
      const priorityLevel = highPriorityCount > 2 ? 'high' : 
                           highPriorityCount > 0 ? 'medium' : 'low';

      return {
        villageId,
        villageName: village.name,
        recommendations: villageRecommendations,
        totalBenefit,
        priorityLevel
      };
    } catch (error) {
      console.error('Error generating village recommendations:', error);
      throw error;
    }
  }

  private calculateEligibility(claim: any, village: any, scheme: any): {
    score: number;
    benefit: number;
    rationale: string;
    requirements: string[];
  } {
    let score = 0;
    let benefit = 0;
    const rationale: string[] = [];
    const requirements: string[] = [];

    switch (scheme.id) {
      case 'pm-kisan':
        // Real PM-KISAN eligibility criteria
        if (claim.claimType === 'IFR' && claim.area && claim.area <= scheme.eligibilityCriteria.maxLandSize) {
          score += 50;
          benefit = scheme.benefits.amount;
          rationale.push(`Eligible as small farmer with ${claim.area} hectares under IFR`);
        }
        if (claim.status === 'approved') {
          score += 25;
          rationale.push('Approved FRA claim provides clear land ownership for PM-KISAN');
        }
        if (['MP', 'Odisha', 'Telangana', 'Tripura'].includes(village.stateName)) {
          score += 15;
          rationale.push('Target state for agricultural development programs');
        }
        requirements.push('Aadhaar card mandatory', 'Bank account with IFSC code', 'Land ownership documents', 'Cultivation certificate from revenue official');
        break;

      case 'jal-jeevan-mission':
        // Real JJM eligibility criteria
        if (village.type === 'rural') {
          score += 40;
          rationale.push('Rural household eligible for Har Ghar Jal program');
        }
        if (!village.waterAccess || village.waterQuality === 'poor') {
          score += 40;
          rationale.push('Priority village due to inadequate water access/quality');
        }
        if (claim.claimType === 'IFR') {
          score += 20;
          rationale.push('Forest rights holders prioritized for water connections');
        }
        const households = Math.ceil((village.population || 100) / 5);
        benefit = households * 35000; // Cost per tap connection
        requirements.push('Household survey completion', 'Village Water and Sanitation Committee formation', 'Community contribution (10-15%)', 'Quality testing protocol');
        break;

      case 'mgnrega':
        // Real MGNREGA eligibility criteria
        if (village.type === 'rural') {
          score += 30;
          rationale.push('Rural area eligible for employment guarantee');
        }
        if (['IFR', 'CFR', 'CR'].includes(claim.claimType)) {
          score += 40;
          rationale.push('Forest rights holders prioritized for livelihood support and asset creation');
        }
        if (claim.status === 'approved' && claim.area > 0.5) {
          score += 30;
          rationale.push('Approved forestland suitable for watershed development and asset creation');
        }
        const eligibleHouseholds = Math.ceil((village.population || 100) / 5);
        benefit = eligibleHouseholds * scheme.benefits.guaranteedDays * scheme.benefits.wageRate;
        requirements.push('Job card registration with photo', 'Bank account mandatory', 'Work demand application', 'Gram Sabha social audit participation');
        break;

      case 'pmjdy':
        // PM Jan Dhan Yojana eligibility
        score += 60;
        rationale.push('Universal financial inclusion program for all adults');
        if (claim.claimType) {
          score += 20;
          rationale.push('FRA claimants need banking services for government transfers');
        }
        benefit = scheme.benefits.accidentInsurance + scheme.benefits.overdraftFacility;
        requirements.push('Aadhaar card', 'Address proof document', 'Passport size photograph', 'Initial deposit Rs. 0');
        break;

      case 'pmfby':
        // PM Fasal Bima Yojana eligibility
        if (claim.claimType === 'IFR' && claim.area && claim.area > 0) {
          score += 50;
          benefit = claim.area * 25000; // Average coverage per hectare
          rationale.push(`Cultivator with ${claim.area} hectares eligible for comprehensive crop insurance`);
        }
        if (claim.status === 'approved') {
          score += 30;
          rationale.push('Legal land rights enable proper insurance coverage');
        }
        requirements.push('Land ownership/cultivation rights', 'Aadhaar-linked bank account', 'Crop sowing details', 'Premium payment (2% kharif, 1.5% rabi)');
        break;

      case 'pm-awas-gramin':
        // PM Awas Yojana Gramin eligibility
        if (village.type === 'rural') {
          score += 45;
          rationale.push('Rural family eligible for pucca house construction');
        }
        if (claim.claimType && claim.status === 'approved') {
          score += 35;
          rationale.push('Forest rights holders with approved claims prioritized for housing');
        }
        if (village.elevation > 1000 || village.tribalPopulation > 30) {
          benefit = scheme.benefits.hillAssistance;
          score += 20;
          rationale.push('Hill/difficult area eligible for enhanced assistance');
        } else {
          benefit = scheme.benefits.plainAssistance;
        }
        requirements.push('SECC 2011 beneficiary verification', 'Aadhaar card', 'Bank account', 'No pucca house certificate', 'Convergence with other schemes');
        break;

      case 'swachh-bharat-mission':
        // Swachh Bharat Mission Gramin eligibility
        if (village.type === 'rural') {
          score += 50;
          benefit = scheme.benefits.toiletConstruction;
          rationale.push('Rural household without toilet eligible for IHHL construction');
        }
        if (claim.claimType && village.forestArea > 50) {
          score += 30;
          rationale.push('Forest-dwelling communities prioritized for sanitation coverage');
        }
        requirements.push('Household survey verification', 'No existing toilet certificate', 'Beneficiary contribution (Labour/material)', 'Post-construction verification');
        break;
    }

    return {
      score: Math.min(100, score),
      benefit,
      rationale: rationale.join('; '),
      requirements
    };
  }

  private determinePriority(score: number): 'high' | 'medium' | 'low' {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  async getSchemeEligibilityMatrix(villageId: string): Promise<any> {
    try {
      const village = await storage.getVillageById(villageId);
      const claims = await storage.getClaimsByVillage(villageId);
      
      const matrix = {
        village: village?.name,
        totalClaims: claims.length,
        verifiedClaims: claims.filter(c => c.status === 'verified').length,
        schemes: this.schemes.map(scheme => ({
          id: scheme.id,
          name: scheme.name,
          eligibleClaims: claims.filter(claim => 
            this.calculateEligibility(claim, village, scheme).score > 50
          ).length,
          totalBenefit: claims.reduce((sum, claim) => 
            sum + this.calculateEligibility(claim, village, scheme).benefit, 0
          )
        }))
      };

      return matrix;
    } catch (error) {
      console.error('Error generating eligibility matrix:', error);
      throw error;
    }
  }
}

export const dssEngine = new DSSEngine();
