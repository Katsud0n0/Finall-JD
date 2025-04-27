
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface AdminControlsProps {
  onClearRequests?: () => void;
}

const AdminControls = ({ onClearRequests }: AdminControlsProps) => {
  const { toast } = useToast();
  const [isClearing, setIsClearing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleClearRequests = async () => {
    setIsClearing(true);
    try {
      // Clear all requests from localStorage
      localStorage.setItem("jd-requests", "[]");
      if (onClearRequests) {
        onClearRequests();
      }
      toast({
        title: "Success",
        description: "All requests have been cleared.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear requests.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    try {
      // Try to seed database using the backend
      const response = await fetch('http://localhost:3000/api/seed', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      toast({
        title: "Database Seeded",
        description: data.message || "Database has been seeded with sample data.",
      });
    } catch (error) {
      console.error("Error seeding database:", error);
      toast({
        title: "Error",
        description: "Failed to seed the database. Make sure the backend server is running.",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-4 bg-jd-card rounded-lg p-4 border border-jd-card">
      <h3 className="font-medium">Admin Controls</h3>
      <div className="space-y-2">
        <Button 
          variant="destructive" 
          onClick={handleClearRequests} 
          disabled={isClearing}
          className="w-full"
        >
          {isClearing ? "Clearing..." : "Clear All Requests"}
        </Button>
        
        <Button
          variant="outline"
          onClick={handleSeedDatabase}
          disabled={isSeeding}
          className="w-full"
        >
          {isSeeding ? "Seeding..." : "Seed Database"}
        </Button>
      </div>
      <p className="text-xs text-jd-mutedText">
        These actions are only available to administrators.
      </p>
    </div>
  );
};

export default AdminControls;
