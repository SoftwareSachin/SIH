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
      name: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
      code: 'PM_KISAN',
      description: 'Direct income support of ₹6,000/year to small & marginal farmer families having combined land holding up to 2 hectares',
      ministry: 'Ministry of Agriculture & Farmers Welfare',
      eligibilityCriteria: {
        maxLandSize: 2, // Real PM-KISAN limit is 2 hectares for small & marginal farmers
        cultivatorStatus: true,
        aadhaarMandatory: true
      },
      benefits: {
        amount: 6000,
        frequency: 'annual',
        installments: 3,
        installmentAmount: 2000
      },
      documents: ['Aadhaar Card', 'Bank Account Details', 'Land Records', 'Cultivation Certificate']
    },
    {
      id: 'central-sector-scholarship',
      name: 'Central Sector Scheme of Scholarships for College and University Students',
      code: 'CSS_SCHOLARSHIP',
      description: 'Merit-based scholarship for students above 80th percentile in Class 12, with family income below ₹8 lakh',
      ministry: 'Ministry of Education',
      eligibilityCriteria: {
        class12Percentile: 80, // Must be above 80th percentile
        familyIncomeLimit: 800000, // ₹8 lakh annual family income
        regularDegree: true,
        ageLimit: 25
      },
      benefits: {
        ugAmount: 12000, // First 3 years graduation
        pgAmount: 20000, // Post-graduation
        duration: 5, // Maximum 5 years
        totalScholarships: 82000 // 82,000 scholarships annually
      },
      documents: ['Aadhaar Card', 'Class 12 Marksheet', 'Income Certificate', 'Bank Passbook', 'Caste Certificate']
    },
    {
      id: 'mgnrega',
      name: 'Mahatma Gandhi NREGA',
      code: 'MGNREGA',
      description: 'Employment guarantee scheme providing 100 days of wage employment per rural household',
      ministry: 'Ministry of Rural Development',
      eligibilityCriteria: {
        ruralArea: true,
        adultMembers: true,
        voluntaryWork: true
      },
      benefits: {
        guaranteedDays: 100,
        wageRate: 250, // Varies by state, average ₹250/day
        unemploymentAllowance: true
      },
      documents: ['Job Card', 'Bank Account', 'Aadhaar Card', 'Work Demand Application']
    },
    {
      id: 'fra-msp-scheme',
      name: 'MSP Scheme for Minor Forest Produce',
      code: 'FRA_MSP',
      description: 'Minimum Support Price scheme for 87 Minor Forest Produce items under Forest Rights Act',
      ministry: 'Ministry of Tribal Affairs',
      eligibilityCriteria: {
        tribalArea: true,
        mfpGatherer: true,
        fraRights: true,
        cooperativeFormation: true
      },
      benefits: {
        mspCoverage: 87, // 87 MFP items covered
        priceIncreaseRange: '300-900%', // Real MSP increases over market rate
        procurementCenters: true,
        valueAddition: true
      },
      documents: ['FRA Title/Rights Certificate', 'SHG/Cooperative Registration', 'Aadhaar Card', 'Bank Account']
    },
    {
      id: 'jal-jeevan-mission',
      name: 'Jal Jeevan Mission (Har Ghar Jal)',
      code: 'JJM',
      description: 'Providing functional household tap water connections (55 liters per person per day) to every rural household',
      ministry: 'Ministry of Jal Shakti',
      eligibilityCriteria: {
        ruralHousehold: true,
        noFHTC: true, // No Functional Household Tap Connection
        villagePlan: true
      },
      benefits: {
        tapConnection: true,
        costPerConnection: 35000, // Average cost ₹35,000 per connection
        waterQuality: true,
        serviceLevel: 55 // 55 LPCD water supply
      },
      documents: ['Household Survey', 'Village Action Plan', 'Water Quality Test', 'Community Contribution']
    },
    {
      id: 'pm-awas-gramin',
      name: 'PM Awas Yojana - Gramin',
      code: 'PMAY_G',
      description: 'Pucca house with basic amenities for homeless and houseless rural families',
      ministry: 'Ministry of Rural Development',
      eligibilityCriteria: {
        secc2011: true, // SECC 2011 verification
        ruralArea: true,
        noPuccaHouse: true,
        excludedCategories: false
      },
      benefits: {
        plainAssistance: 130000, // ₹1.30 lakh in plains
        hillAssistance: 130000, // ₹1.30 lakh in hills/difficult areas  
        convergence: true,
        skillDevelopment: true
      },
      documents: ['SECC Data', 'Aadhaar Card', 'Bank Account', 'No Pucca House Certificate', 'Caste Certificate']
    },
    {
      id: 'eklavya-model-schools',
      name: 'Eklavya Model Residential Schools (EMRS)',
      code: 'EMRS',
      description: 'Quality education for ST students from Class VI to XII in tribal areas',
      ministry: 'Ministry of Tribal Affairs',
      eligibilityCriteria: {
        stCategory: true,
        tribalArea: true,
        stPopulation50Plus: true, // Areas with 50%+ ST population
        ageGroup: [11, 18],
        meritBased: true
      },
      benefits: {
        freeEducation: true,
        boarding: true,
        lodging: true,
        uniformBooks: true,
        cbseAffiliated: true,
        skillDevelopment: true
      },
      documents: ['ST Certificate', 'Residential Certificate', 'Birth Certificate', 'Aadhaar Card', 'Income Certificate']
    },
    {
      id: 'pmjay',
      name: 'PM-JAY (Ayushman Bharat)',
      code: 'PMJAY',
      description: 'Health insurance coverage of ₹5 lakh per family per year for secondary and tertiary care',
      ministry: 'Ministry of Health & Family Welfare',
      eligibilityCriteria: {
        secc2011Listed: true,
        rsby: true, // Existing RSBY beneficiaries
        occupationalCategory: true,
        deprivationCriteria: true
      },
      benefits: {
        coverageAmount: 500000, // ₹5 lakh per family per year
        cashlessService: true,
        preExistingConditions: true,
        empanelledHospitals: true
      },
      documents: ['Ration Card', 'Aadhaar Card', 'SECC Database Verification', 'Family ID']
    },
    {
      id: 'pmfby',
      name: 'PM Fasal Bima Yojana',
      code: 'PMFBY',
      description: 'Comprehensive crop insurance covering pre-sowing to post-harvest losses',
      ministry: 'Ministry of Agriculture & Farmers Welfare',
      eligibilityCriteria: {
        farmerStatus: true,
        notifiedCrops: true,
        bankAccount: true,
        aadhaarLinked: true
      },
      benefits: {
        premiumSubsidy: true,
        kharifPremium: 2, // 2% of sum insured for Kharif crops
        rabiPremium: 1.5, // 1.5% of sum insured for Rabi crops
        horticulturalPremium: 5, // 5% for horticultural crops
        coverageAmount: 200000 // Average sum insured per hectare
      },
      documents: ['Land Records', 'Aadhaar Card', 'Bank Account', 'Sowing Certificate', 'Premium Payment']
    },
    {
      id: 'fra-development-schemes',
      name: 'FRA Village Development Schemes',
      code: 'FRA_DEVELOPMENT',
      description: 'Infrastructure and development schemes for villages with recognized forest rights under FRA 2006',
      ministry: 'Ministry of Tribal Affairs',
      eligibilityCriteria: {
        fraImplemented: true,
        recognizedRights: true,
        gramSabhaConsent: true,
        tribalPopulation: 25 // 25%+ tribal population
      },
      benefits: {
        infrastructureDevelopment: true,
        roadsConnectivity: true,
        healthcareAccess: true,
        educationFacilities: true,
        livelihoodSupport: true,
        forestConservation: true
      },
      documents: ['FRA Title/Rights Certificate', 'Gram Sabha Resolution', 'Village Development Plan', 'CFR Rights Certificate']
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
          eligibilityScore: rec.eligibilityScore.toString(),
          estimatedBenefit: rec.estimatedBenefit.toString(),
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
        // Real PM-KISAN eligibility: 2 hectare limit for small & marginal farmers
        if (claim.claimType === 'IFR' && claim.area && claim.area <= scheme.eligibilityCriteria.maxLandSize) {
          score += 60;
          benefit = scheme.benefits.amount;
          rationale.push(`Eligible as small farmer with ${claim.area} hectares under Individual Forest Rights (within 2 hectare limit)`);
        }
        if (claim.status === 'verified') {
          score += 30;
          rationale.push('Verified FRA claim provides cultivator status recognition for PM-KISAN enrollment');
        }
        requirements.push(...scheme.documents);
        break;

      case 'central-sector-scholarship':
        // CSS eligibility: 80th percentile in Class 12, income below ₹8 lakh
        // This scheme typically applies to children of claimants, not claimants directly
        if (village.tribalPopulation && village.tribalPopulation > 20) {
          score += 40;
          rationale.push('Tribal area families prioritized for educational scholarships');
        }
        if (claim.status === 'verified') {
          score += 30;
          rationale.push('Land rights provide economic stability for continuing education');
        }
        // Benefit varies by course level
        benefit = (scheme.benefits.ugAmount + scheme.benefits.pgAmount) / 2; // Average benefit
        requirements.push(...scheme.documents);
        break;

      case 'mgnrega':
        // Real MGNREGA eligibility: Rural adults, employment guarantee
        if (village.type === 'rural' || !village.type) {
          score += 40;
          rationale.push('Rural area eligible for guaranteed employment under MGNREGA');
        }
        if (['IFR', 'CFR', 'CR'].includes(claim.claimType)) {
          score += 35;
          rationale.push('Forest rights holders prioritized for natural resource management works');
        }
        if (claim.status === 'verified' && claim.area && claim.area > 0.5) {
          score += 25;
          rationale.push('Verified forestland suitable for watershed development and conservation works');
        }
        const eligibleHouseholds = Math.ceil((village.population || 100) / 5);
        benefit = eligibleHouseholds * scheme.benefits.guaranteedDays * scheme.benefits.wageRate;
        requirements.push(...scheme.documents);
        break;

      case 'fra-msp-scheme':
        // MSP for 87 Minor Forest Produce items under FRA
        if (['IFR', 'CFR', 'CR'].includes(claim.claimType)) {
          score += 50;
          rationale.push('Forest rights holders eligible for MSP scheme for Minor Forest Produce');
        }
        if (claim.status === 'verified') {
          score += 40;
          rationale.push('Verified forest rights enable legal MFP collection and sale at MSP');
        }
        if (village.tribalPopulation && village.tribalPopulation > 50) {
          score += 10;
          rationale.push('High tribal population area with traditional MFP gathering practices');
        }
        // Estimated benefit based on average MFP income increase
        benefit = (claim.area || 1) * 15000; // ₹15,000 additional income per hectare from MSP
        requirements.push(...scheme.documents);
        break;

      case 'jal-jeevan-mission':
        // Real JJM eligibility: Rural households without functional tap connections
        if (village.type === 'rural' || !village.type) {
          score += 50;
          rationale.push('Rural household eligible for functional household tap connection under Har Ghar Jal');
        }
        if (claim.claimType && claim.status === 'verified') {
          score += 30;
          rationale.push('Forest rights holders prioritized for water security and quality assurance');
        }
        if (village.tribalPopulation && village.tribalPopulation > 30) {
          score += 20;
          rationale.push('Tribal areas given priority for water supply infrastructure');
        }
        const households = Math.ceil((village.population || 100) / 5);
        benefit = households * scheme.benefits.costPerConnection;
        requirements.push(...scheme.documents);
        break;

      case 'pm-awas-gramin':
        // Real PMAY-G eligibility: SECC 2011 verification, rural homeless/houseless
        if (village.type === 'rural' || !village.type) {
          score += 45;
          rationale.push('Rural family eligible for pucca house construction assistance');
        }
        if (claim.claimType && claim.status === 'verified') {
          score += 40;
          rationale.push('Forest rights holders with verified claims prioritized for housing development');
        }
        if (village.tribalPopulation && village.tribalPopulation > 25) {
          score += 15;
          rationale.push('Tribal areas receive priority under housing scheme');
        }
        benefit = scheme.benefits.plainAssistance; // ₹1.30 lakh assistance
        requirements.push(...scheme.documents);
        break;

      case 'eklavya-model-schools':
        // EMRS eligibility: ST students, 50%+ ST population areas
        if (village.tribalPopulation && village.tribalPopulation >= 50) {
          score += 70;
          rationale.push('Area with 50%+ ST population eligible for Eklavya Model Residential School');
        }
        if (claim.claimType && claim.status === 'verified') {
          score += 20;
          rationale.push('Forest rights recognition supports educational infrastructure development');
        }
        // Educational benefit for tribal children in the village
        benefit = 150000; // Estimated annual education cost per student including boarding
        requirements.push(...scheme.documents);
        break;

      case 'pmjay':
        // Real PM-JAY eligibility: SECC 2011 listed families, deprivation criteria
        if (village.type === 'rural' || !village.type) {
          score += 50;
          rationale.push('Rural family eligible for health insurance coverage under Ayushman Bharat');
        }
        if (claim.claimType && village.tribalPopulation && village.tribalPopulation > 20) {
          score += 30;
          rationale.push('Tribal families in forest areas automatically eligible for health coverage');
        }
        if (claim.status === 'verified') {
          score += 20;
          rationale.push('Land rights provide residential verification for health insurance enrollment');
        }
        benefit = scheme.benefits.coverageAmount; // ₹5 lakh per family per year
        requirements.push(...scheme.documents);
        break;

      case 'pmfby':
        // Real PMFBY eligibility: Farmers with notified crops, Aadhaar-linked bank account
        if (claim.claimType === 'IFR' && claim.area && claim.area > 0) {
          score += 60;
          benefit = claim.area * scheme.benefits.coverageAmount; // Coverage per hectare
          rationale.push(`Cultivator with ${claim.area} hectares eligible for comprehensive crop insurance`);
        }
        if (claim.status === 'verified') {
          score += 30;
          rationale.push('Verified land rights enable proper crop insurance enrollment and claims');
        }
        requirements.push(...scheme.documents);
        break;

      case 'fra-development-schemes':
        // FRA Village Development eligibility: Recognized forest rights, Gram Sabha consent
        if (['IFR', 'CFR', 'CR'].includes(claim.claimType)) {
          score += 50;
          rationale.push('Village with recognized forest rights eligible for FRA development schemes');
        }
        if (claim.status === 'verified') {
          score += 40;
          rationale.push('Verified forest rights enable community development and infrastructure projects');
        }
        if (village.tribalPopulation && village.tribalPopulation >= 25) {
          score += 10;
          rationale.push('Adequate tribal population for FRA implementation and development schemes');
        }
        // Estimated village development benefit
        benefit = 500000; // ₹5 lakh estimated per village for infrastructure development
        requirements.push(...scheme.documents);
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

  async getAllSchemes(): Promise<any[]> {
    try {
      return this.schemes.map(scheme => ({
        id: scheme.id,
        name: scheme.name,
        code: scheme.code,
        description: scheme.description,
        ministry: scheme.ministry,
        category: this.getSchemeCategory(scheme),
        targetBeneficiaries: this.getTargetBeneficiaries(scheme),
        benefits: this.getBenefitsSummary(scheme),
        eligibilityCriteria: scheme.eligibilityCriteria,
        documents: scheme.documents
      }));
    } catch (error) {
      console.error('Error fetching all schemes:', error);
      throw error;
    }
  }

  async getSchemeDetails(schemeId: string): Promise<any | null> {
    try {
      const scheme = this.schemes.find(s => s.id === schemeId);
      if (!scheme) {
        return null;
      }

      return {
        ...scheme,
        category: this.getSchemeCategory(scheme),
        targetBeneficiaries: this.getTargetBeneficiaries(scheme),
        benefitsSummary: this.getBenefitsSummary(scheme),
        applicationGuidance: this.getApplicationGuidance(scheme),
        eligibilityDetails: this.getEligibilityDetails(scheme)
      };
    } catch (error) {
      console.error('Error fetching scheme details:', error);
      throw error;
    }
  }

  async searchSchemes(criteria: {
    category?: string;
    ministry?: string;
    targetBeneficiaries?: string;
    searchTerm?: string;
  }): Promise<any[]> {
    try {
      let filteredSchemes = this.schemes;

      // Filter by category
      if (criteria.category) {
        filteredSchemes = filteredSchemes.filter(scheme => 
          this.getSchemeCategory(scheme).toLowerCase().includes(criteria.category!.toLowerCase())
        );
      }

      // Filter by ministry
      if (criteria.ministry) {
        filteredSchemes = filteredSchemes.filter(scheme => 
          scheme.ministry.toLowerCase().includes(criteria.ministry!.toLowerCase())
        );
      }

      // Filter by target beneficiaries
      if (criteria.targetBeneficiaries) {
        filteredSchemes = filteredSchemes.filter(scheme => 
          this.getTargetBeneficiaries(scheme).toLowerCase().includes(criteria.targetBeneficiaries!.toLowerCase())
        );
      }

      // Filter by search term (name, description, code)
      if (criteria.searchTerm) {
        const searchTerm = criteria.searchTerm.toLowerCase();
        filteredSchemes = filteredSchemes.filter(scheme => 
          scheme.name.toLowerCase().includes(searchTerm) ||
          scheme.description.toLowerCase().includes(searchTerm) ||
          scheme.code.toLowerCase().includes(searchTerm)
        );
      }

      return filteredSchemes.map(scheme => ({
        id: scheme.id,
        name: scheme.name,
        code: scheme.code,
        description: scheme.description,
        ministry: scheme.ministry,
        category: this.getSchemeCategory(scheme),
        targetBeneficiaries: this.getTargetBeneficiaries(scheme),
        benefits: this.getBenefitsSummary(scheme)
      }));
    } catch (error) {
      console.error('Error searching schemes:', error);
      throw error;
    }
  }

  private getSchemeCategory(scheme: any): string {
    // Categorize schemes based on their purpose
    if (scheme.id.includes('scholarship') || scheme.id.includes('education') || scheme.id.includes('emrs')) {
      return 'Education';
    } else if (scheme.id.includes('pm-kisan') || scheme.id.includes('pmfby') || scheme.id.includes('fra-msp')) {
      return 'Agriculture & Livelihood';
    } else if (scheme.id.includes('jal-jeevan') || scheme.id.includes('awas') || scheme.id.includes('development')) {
      return 'Infrastructure';
    } else if (scheme.id.includes('pmjay')) {
      return 'Healthcare';
    } else if (scheme.id.includes('mgnrega')) {
      return 'Employment';
    } else if (scheme.id.includes('fra')) {
      return 'Forest Rights & Tribal Welfare';
    }
    return 'General Welfare';
  }

  private getTargetBeneficiaries(scheme: any): string {
    // Determine target beneficiaries based on scheme criteria
    if (scheme.eligibilityCriteria.stCategory || scheme.ministry === 'Ministry of Tribal Affairs') {
      return 'Scheduled Tribes';
    } else if (scheme.eligibilityCriteria.farmerStatus || scheme.eligibilityCriteria.cultivatorStatus) {
      return 'Farmers & Cultivators';
    } else if (scheme.eligibilityCriteria.ruralArea || scheme.eligibilityCriteria.ruralHousehold) {
      return 'Rural Households';
    } else if (scheme.eligibilityCriteria.secc2011 || scheme.eligibilityCriteria.bplCard) {
      return 'Below Poverty Line Families';
    }
    return 'All Eligible Citizens';
  }

  private getBenefitsSummary(scheme: any): string {
    // Generate a summary of scheme benefits
    if (scheme.benefits.amount) {
      return `₹${scheme.benefits.amount}${scheme.benefits.frequency === 'annual' ? '/year' : ''}`;
    } else if (scheme.benefits.coverageAmount) {
      return `₹${scheme.benefits.coverageAmount} insurance coverage`;
    } else if (scheme.benefits.plainAssistance) {
      return `₹${scheme.benefits.plainAssistance} housing assistance`;
    } else if (scheme.benefits.guaranteedDays) {
      return `${scheme.benefits.guaranteedDays} days guaranteed employment`;
    } else if (scheme.benefits.ugAmount) {
      return `₹${scheme.benefits.ugAmount}-${scheme.benefits.pgAmount} education support`;
    }
    return 'Various benefits as per scheme guidelines';
  }

  private getApplicationGuidance(scheme: any): string {
    return `To apply for ${scheme.name}:
1. Ensure you meet the eligibility criteria
2. Gather required documents: ${scheme.documents.join(', ')}
3. Visit the nearest government office or apply online
4. Contact the implementing ministry (${scheme.ministry}) for assistance
5. Follow up on application status regularly`;
  }

  private getEligibilityDetails(scheme: any): string {
    const criteria = Object.entries(scheme.eligibilityCriteria)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    return `Key eligibility criteria: ${criteria}`;
  }
}

export const dssEngine = new DSSEngine();
