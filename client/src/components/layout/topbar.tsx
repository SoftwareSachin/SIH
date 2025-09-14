import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Bell } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import governmentEmblem from "@/assets/government-emblem.png";

export default function TopBar() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <img 
              src={governmentEmblem} 
              alt="Government of India Emblem" 
              className="h-12 w-auto object-contain bg-transparent"
            />
            <div>
              <h2 className="text-xl font-semibold text-foreground">FRA Atlas Dashboard</h2>
              <p className="text-sm text-muted-foreground">Real-time monitoring and decision support</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Search villages, claims..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          </div>
          
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Notifications */}
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}