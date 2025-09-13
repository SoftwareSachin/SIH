import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  User, 
  FileText, 
  MapPin, 
  UserCheck, 
  Gavel, 
  TrendingUp,
  ArrowRight,
  History,
  ChevronRight
} from 'lucide-react';

interface VerificationWorkflowProps {
  claimId: string;
}

interface WorkflowStep {
  id: string;
  stepId: string;
  stepName: string;
  stepOrder: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  verifiedBy?: string;
  result?: any;
  errors?: string[];
  notes?: string;
}

interface VerificationWorkflow {
  id: string;
  claimId: string;
  currentStep: number;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'on_hold';
  priority: string;
  assignedTo?: string;
  startedAt: string;
  completedAt?: string;
  estimatedCompletion?: string;
  notes?: string;
}

interface AuditEntry {
  id: string;
  action: string;
  timestamp: string;
  userId: string;
  userRole: string;
  notes?: string;
  newValues?: any;
}

export function VerificationWorkflow({ claimId }: VerificationWorkflowProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('workflow');
  const [assignUserEmail, setAssignUserEmail] = useState('');
  const [escalationReason, setEscalationReason] = useState('');

  // Fetch workflow status
  const { data: workflowData, isLoading, error } = useQuery({
    queryKey: [`/api/workflow/status/${claimId}`],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch audit trail
  const { data: auditData } = useQuery({
    queryKey: [`/api/workflow/audit/${claimId}`],
    enabled: selectedTab === 'audit',
  });

  // Initialize workflow mutation
  const initializeWorkflowMutation = useMutation({
    mutationFn: async ({ priority }: { priority: string }) => {
      const response = await fetch(`/api/workflow/initialize/${claimId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priority })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initialize workflow');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Workflow Initialized",
        description: "Verification workflow has been successfully initialized.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/workflow/status/${claimId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Initialization Failed",
        description: error.message || "Failed to initialize workflow",
        variant: "destructive",
      });
    },
  });

  // Process step mutation
  const processStepMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/workflow/process-step/${claimId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process workflow step');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Step Processed",
        description: "Workflow step has been processed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/workflow/status/${claimId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process workflow step",
        variant: "destructive",
      });
    },
  });

  // Assign workflow mutation
  const assignWorkflowMutation = useMutation({
    mutationFn: async ({ assignedTo }: { assignedTo: string }) => {
      const response = await fetch(`/api/workflow/assign/${claimId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignedTo })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to assign workflow');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Workflow Assigned",
        description: "Workflow has been assigned successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/workflow/status/${claimId}`] });
      setAssignUserEmail('');
    },
    onError: (error: Error) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign workflow",
        variant: "destructive",
      });
    },
  });

  // Escalate workflow mutation
  const escalateWorkflowMutation = useMutation({
    mutationFn: async ({ reason }: { reason: string }) => {
      const response = await fetch(`/api/workflow/escalate/${claimId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to escalate workflow');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Workflow Escalated",
        description: "Workflow has been escalated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/workflow/status/${claimId}`] });
      setEscalationReason('');
    },
    onError: (error: Error) => {
      toast({
        title: "Escalation Failed",
        description: error.message || "Failed to escalate workflow",
        variant: "destructive",
      });
    },
  });

  const getStepIcon = (stepId: string) => {
    const icons = {
      document_upload: FileText,
      ocr_processing: FileText,
      ner_extraction: FileText,
      spatial_validation: MapPin,
      field_verification: UserCheck,
      technical_review: CheckCircle,
      dss_analysis: TrendingUp,
      final_approval: Gavel
    };
    return icons[stepId as keyof typeof icons] || CheckCircle;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Verification Workflow...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Clock className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !workflowData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verification Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8">
            <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Workflow Found</h3>
            <p className="text-gray-600 mb-4">
              This claim doesn't have a verification workflow yet.
            </p>
            <Button 
              onClick={() => initializeWorkflowMutation.mutate({ priority: 'medium' })}
              disabled={initializeWorkflowMutation.isPending}
              data-testid="button-initialize-workflow"
            >
              {initializeWorkflowMutation.isPending ? 'Initializing...' : 'Initialize Workflow'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const workflowResult = workflowData as any;
  const workflow = workflowResult?.workflow || {} as VerificationWorkflow;
  const steps = workflowResult?.steps || [] as WorkflowStep[];
  const currentStep = steps[workflow.currentStep];
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  return (
    <div className="space-y-6">
      {/* Workflow Overview */}
      <Card data-testid="card-workflow-overview">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Verification Workflow</CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={getPriorityColor(workflow.priority)} data-testid="badge-priority">
                {workflow.priority.toUpperCase()} PRIORITY
              </Badge>
              <Badge className={getStatusColor(workflow.status)} data-testid="badge-status">
                {workflow.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress: {completedSteps} of {steps.length} steps completed</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="w-full" data-testid="progress-workflow" />
            </div>
            
            {currentStep && workflow.status !== 'completed' && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Current Step:</strong> {currentStep.stepName}
                  {currentStep.status === 'in_progress' && (
                    <span className="ml-2 text-blue-600">In Progress</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => processStepMutation.mutate()}
                disabled={processStepMutation.isPending || workflow.status === 'completed'}
                data-testid="button-process-step"
              >
                {processStepMutation.isPending ? 'Processing...' : 'Process Next Step'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <Button variant="outline" data-testid="button-refresh" onClick={() => {
                queryClient.invalidateQueries({ queryKey: [`/api/workflow/status/${claimId}`] });
              }}>
                Refresh Status
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Workflow */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="workflow" data-testid="tab-workflow">Workflow Steps</TabsTrigger>
          <TabsTrigger value="management" data-testid="tab-management">Management</TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="space-y-4">
          {steps.map((step, index) => {
            const StepIcon = getStepIcon(step.stepId);
            const isActive = index === workflow.currentStep;
            
            return (
              <Card 
                key={step.id} 
                className={isActive ? 'border-blue-500 bg-blue-50' : ''}
                data-testid={`card-step-${step.stepId}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full ${
                      step.status === 'completed' 
                        ? 'bg-green-100 text-green-600'
                        : step.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-600'
                          : step.status === 'failed'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-gray-100 text-gray-400'
                    }`}>
                      <StepIcon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{step.stepName}</h4>
                        <Badge 
                          className={getStatusColor(step.status)}
                          data-testid={`badge-step-status-${step.stepId}`}
                        >
                          {step.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 mt-1">
                        Step {step.stepOrder + 1} of {steps.length}
                      </div>
                      
                      {step.startedAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          Started: {new Date(step.startedAt).toLocaleString()}
                        </div>
                      )}
                      
                      {step.completedAt && (
                        <div className="text-xs text-gray-500">
                          Completed: {new Date(step.completedAt).toLocaleString()}
                        </div>
                      )}
                      
                      {step.verifiedBy && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <User className="h-3 w-3" />
                          Verified by: {step.verifiedBy}
                        </div>
                      )}
                      
                      {step.errors && step.errors.length > 0 && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          <div className="text-xs font-medium text-red-800">Errors:</div>
                          {step.errors.map((error, errorIndex) => (
                            <div key={errorIndex} className="text-xs text-red-600">
                              • {error}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {step.result && (
                        <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded">
                          <div className="text-xs font-medium text-gray-800">Result:</div>
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                            {JSON.stringify(step.result, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="management" className="space-y-4">
          <Card data-testid="card-workflow-assignment">
            <CardHeader>
              <CardTitle>Assignment & Escalation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Assign to User (Email)</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="email"
                    value={assignUserEmail}
                    onChange={(e) => setAssignUserEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    data-testid="input-assign-user"
                  />
                  <Button
                    onClick={() => assignWorkflowMutation.mutate({ assignedTo: assignUserEmail })}
                    disabled={!assignUserEmail || assignWorkflowMutation.isPending}
                    data-testid="button-assign-workflow"
                  >
                    {assignWorkflowMutation.isPending ? 'Assigning...' : 'Assign'}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Escalation Reason</label>
                <Textarea
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  placeholder="Provide reason for escalation..."
                  className="mt-1"
                  data-testid="textarea-escalation-reason"
                />
                <Button
                  className="mt-2"
                  variant="outline"
                  onClick={() => escalateWorkflowMutation.mutate({ reason: escalationReason })}
                  disabled={!escalationReason || escalateWorkflowMutation.isPending}
                  data-testid="button-escalate-workflow"
                >
                  {escalateWorkflowMutation.isPending ? 'Escalating...' : 'Escalate Workflow'}
                  <AlertTriangle className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card data-testid="card-audit-trail">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditData && Array.isArray(auditData) && auditData.length > 0 ? (
                <div className="space-y-3">
                  {(auditData as AuditEntry[]).map((entry: AuditEntry) => (
                    <div 
                      key={entry.id} 
                      className="flex gap-3 p-3 border border-gray-200 rounded-lg"
                      data-testid={`audit-entry-${entry.action}`}
                    >
                      <div className="p-1 rounded-full bg-blue-100 text-blue-600">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{entry.action.replace('_', ' ').toUpperCase()}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          By: {entry.userRole} user {entry.userId}
                        </div>
                        {entry.notes && (
                          <div className="text-sm text-gray-500 mt-1">{entry.notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 text-gray-500">
                  No audit entries found for this workflow.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}