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
        if (claim.claimType === 'IFR' && claim.area && claim.area <= scheme.eligibilityCriteria.maxLandSize) {
          score += 40;
          rationale.push('IFR claim qualifies for farmer benefits');
        }
        if (claim.status === 'verified') {
          score += 30;
          rationale.push('Verified claim increases eligibility');
        }
        if (village.tribalPopulation && village.tribalPopulation > 0) {
          score += 20;
          rationale.push('Tribal area gets priority');
        }
        benefit = scheme.benefits.amount;
        requirements.push('Aadhaar card required', 'Bank account linking needed');
        break;

      case 'jal-jeevan-mission':
        if (village.population && village.population > 100) {
          score += 50;
          rationale.push('Village size qualifies for water infrastructure');
        }
        if (village.tribalPopulation && village.tribalPopulation > village.population * 0.3) {
          score += 30;
          rationale.push('High tribal population gets priority');
        }
        benefit = scheme.benefits.estimatedCost * (village.population || 100) / 5; // Assume 5 people per household
        requirements.push('Village water committee formation', 'Community contribution');
        break;

      case 'mgnrega':
        if (claim.claimType === 'CFR') {
          score += 40;
          rationale.push('Community forest rights enable collective employment');
        }
        if (village.tribalPopulation && village.tribalPopulation > 0) {
          score += 35;
          rationale.push('Tribal areas have guaranteed MGNREGA access');
        }
        const households = Math.ceil((village.population || 100) / 5);
        benefit = households * scheme.benefits.guaranteedDays * scheme.benefits.wageRate;
        requirements.push('Job card registration', 'Gram Sabha approval');
        break;

      case 'dajgua':
        if (village.tribalPopulation && village.tribalPopulation > village.population * 0.5) {
          score += 60;
          rationale.push('High tribal population qualifies for DAJGUA');
        }
        if (claim.status === 'verified') {
          score += 25;
          rationale.push('Verified FRA claims support development planning');
        }
        benefit = 500000; // Estimated package benefit
        requirements.push('Tribal Sub-Plan allocation', 'Multi-sector coordination');
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
