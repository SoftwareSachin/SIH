import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Bell } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import governmentEmblem from "@/assets/government-emblem.png";

export default function TopBar() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="bg-card border-b border-border shadow-sm px-8 py-6">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center">
          <div className="flex items-center space-x-5">
            <div className="flex-shrink-0 p-3 rounded-xl bg-card dark:bg-slate-800 border border-border shadow-lg">
              <img 
                src={governmentEmblem} 
                alt="Government of India Emblem" 
                className="h-12 w-12 object-contain drop-shadow-sm"
              />
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">FRA Atlas Dashboard</h1>
              <p className="text-sm text-muted-foreground font-medium mt-1">Monitoring and decision support</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          {/* Search */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Search villages, claims..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-72 pl-10 h-10 bg-background border-border focus:border-primary"
              data-testid="input-search"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          </div>
          
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="h-10 w-10" data-testid="button-notifications">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}