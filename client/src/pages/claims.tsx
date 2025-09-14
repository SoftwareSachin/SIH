import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import ClaimsTable from "@/components/claims/claims-table";
import ClaimForm from "@/components/claims/claim-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export default function Claims() {
  const [isNewClaimOpen, setIsNewClaimOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <TopBar />
        
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Claims Management</h1>
              <p className="text-muted-foreground">
                Manage and track Forest Rights Act claims
              </p>
            </div>
            
            <Dialog open={isNewClaimOpen} onOpenChange={setIsNewClaimOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-claim">
                  <Plus className="h-4 w-4 mr-2" />
                  New Claim
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New FRA Claim</DialogTitle>
                </DialogHeader>
                <ClaimForm 
                  onSuccess={() => setIsNewClaimOpen(false)}
                  onCancel={() => setIsNewClaimOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          <ClaimsTable showHeader={false} />
        </div>
      </div>
    </div>
  );
}