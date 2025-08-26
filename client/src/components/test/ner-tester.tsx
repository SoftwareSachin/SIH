import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, Users, MapPin, Calendar, Ruler, Target } from 'lucide-react';

interface NERResult {
  success: boolean;
  extractedEntities: {
    names: string[];
    villages: string[];
    areas: string[];
    coordinates: string[];
    dates: string[];
    claimTypes: string[];
    claimStatus: string[];
    documentTypes: string[];
    surveyNumbers: string[];
    boundaries: string[];
  };
  structuredClaimRecords: Array<{
    claimantName: string;
    villageName: string;
    claimType: string;
    claimStatus: string;
    areaClaimed?: string;
    coordinates?: string;
    applicationDate?: string;
    approvalDate?: string;
    surveyNumber?: string;
    extractionConfidence: number;
  }>;
  summary: {
    namesFound: number;
    villagesFound: number;
    areasFound: number;
    coordinatesFound: number;
    datesFound: number;
    claimTypesFound: number;
    claimStatusFound: number;
    documentTypesFound: number;
    surveyNumbersFound: number;
    boundariesFound: number;
  };
  claimsCreated: number;
}

const sampleTexts = {
  english: `Application for Individual Forest Rights (IFR)
Claimant Name: Ramesh Kumar Singh
Village: Bandhavgarh, District: Umaria
Area Claimed: 2.5 acres
Survey Number: 125/2
Application Date: 15 March 2023
Status: Approved
Coordinates: 23.7041° N, 80.9340° E
North: River boundary, South: Village road
East: Forest area, West: Agricultural land`,
  
  hindi: `वन अधिकार आवेदन फॉर्म
आवेदक का नाम: सुनीता देवी
ग्राम: झारसुगुडा, जिला: उड़ीसा
भूमि का क्षेत्रफल: 1.8 एकड़
खसरा नंबर: 45/3
आवेदन दिनांक: 10 अप्रैल 2023
स्थिति: लंबित
उत्तर: नदी, दक्षिण: गाँव की सड़क
पूर्व: जंगल, पश्चिम: खेत`,
  
  mixed: `Community Forest Resource Rights Application
Claimant: Adivasi Gram Sabha, Village Bastar
Area: 15.2 hectares of forest land
Application submitted on 5th June 2023
Survey Numbers: 78/1, 78/2, 79/1
Status: Under Review by Forest Department
GPS: 19.0760° N, 81.9378° E
Boundaries - उत्तर: पहाड़, South: नदी का किनारा`
};

export function NERTester() {
  const [text, setText] = useState(sampleTexts.english);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NERResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testNER = async () => {
    if (!text.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/test/ner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'NER processing failed');
      }
      
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadSampleText = (sample: keyof typeof sampleTexts) => {
    setText(sampleTexts[sample]);
    setResult(null);
    setError(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>FRA Named Entity Recognition (NER) Tester</span>
          </CardTitle>
          <CardDescription>
            Test the AI-powered entity extraction system for Forest Rights Act documents. 
            This system can automatically detect claimant names, village names, areas, claim types, 
            statuses, dates, and coordinates from FRA documents in multiple languages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadSampleText('english')}
              data-testid="button-sample-english"
            >
              English Sample
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadSampleText('hindi')}
              data-testid="button-sample-hindi"
            >
              Hindi Sample
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadSampleText('mixed')}
              data-testid="button-sample-mixed"
            >
              Mixed Language Sample
            </Button>
          </div>
          
          <Textarea
            placeholder="Enter FRA document text to extract entities from..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            data-testid="textarea-ner-input"
          />
          
          <Button 
            onClick={testNER} 
            disabled={loading || !text.trim()}
            data-testid="button-test-ner"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Extract FRA Entities
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600" data-testid="text-error">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Extraction Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Names:</span>
                  <Badge variant="secondary" data-testid="badge-names-count">{result.summary.namesFound}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Villages:</span>
                  <Badge variant="secondary" data-testid="badge-villages-count">{result.summary.villagesFound}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Areas:</span>
                  <Badge variant="secondary" data-testid="badge-areas-count">{result.summary.areasFound}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coordinates:</span>
                  <Badge variant="secondary" data-testid="badge-coordinates-count">{result.summary.coordinatesFound}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dates:</span>
                  <Badge variant="secondary" data-testid="badge-dates-count">{result.summary.datesFound}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Claim Types:</span>
                  <Badge variant="secondary" data-testid="badge-claim-types-count">{result.summary.claimTypesFound}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="secondary" data-testid="badge-status-count">{result.summary.claimStatusFound}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Survey Numbers:</span>
                  <Badge variant="secondary" data-testid="badge-survey-count">{result.summary.surveyNumbersFound}</Badge>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="text-center">
                <Badge variant="default" className="text-lg px-4 py-2" data-testid="badge-claims-created">
                  {result.claimsCreated} Structured Claim Records Created
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Structured Claim Records</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                {result.structuredClaimRecords.map((record, index) => (
                  <div key={index} className="mb-4 p-3 border rounded-lg" data-testid={`claim-record-${index}`}>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{record.claimantName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{record.villageName}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Type:</span> {record.claimType}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span> 
                          <Badge variant="outline" className="ml-1">{record.claimStatus}</Badge>
                        </div>
                        {record.areaClaimed && (
                          <div>
                            <span className="text-muted-foreground">Area:</span> {record.areaClaimed}
                          </div>
                        )}
                        {record.coordinates && (
                          <div>
                            <span className="text-muted-foreground">GPS:</span> {record.coordinates}
                          </div>
                        )}
                        {record.applicationDate && (
                          <div>
                            <span className="text-muted-foreground">Applied:</span> {record.applicationDate}
                          </div>
                        )}
                        {record.surveyNumber && (
                          <div>
                            <span className="text-muted-foreground">Survey:</span> {record.surveyNumber}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Confidence: {record.extractionConfidence}%
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Extracted Entities (Raw Data)</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-60">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(result.extractedEntities).map(([category, items]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="font-medium capitalize text-sm">{category.replace(/([A-Z])/g, ' $1').trim()}:</h4>
                      {items.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {items.map((item: string, index: number) => (
                            <Badge 
                              key={index} 
                              variant="outline" 
                              className="text-xs"
                              data-testid={`entity-${category}-${index}`}
                            >
                              {item}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">None found</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}