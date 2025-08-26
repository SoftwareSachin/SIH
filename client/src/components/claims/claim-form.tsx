import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const claimFormSchema = z.object({
  claimantName: z.string().min(2, "Claimant name is required"),
  claimantFatherName: z.string().optional(),
  claimantAddress: z.string().optional(),
  villageId: z.string().min(1, "Please select a village"),
  claimType: z.enum(["IFR", "CFR", "CR"], { required_error: "Please select claim type" }),
  area: z.string().optional(),
  coordinates: z.string().optional(),
  notes: z.string().optional(),
});

type ClaimFormData = z.infer<typeof claimFormSchema>;

interface ClaimFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ClaimForm({ onSuccess, onCancel }: ClaimFormProps) {
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      claimantName: '',
      claimantFatherName: '',
      claimantAddress: '',
      villageId: '',
      claimType: 'IFR',
      area: '',
      coordinates: '',
      notes: '',
    },
  });

  // Fetch geographic data
  const { data: states } = useQuery({
    queryKey: ["/api/geo/states"],
  });

  const { data: districts } = useQuery({
    queryKey: ["/api/geo/districts", selectedState],
    enabled: !!selectedState,
  });

  const { data: villages } = useQuery({
    queryKey: ["/api/geo/villages", selectedDistrict],
    enabled: !!selectedDistrict,
  });

  const createClaimMutation = useMutation({
    mutationFn: async (data: ClaimFormData) => {
      const payload = {
        ...data,
        area: data.area ? parseFloat(data.area) : undefined,
        coordinates: data.coordinates ? JSON.parse(data.coordinates) : undefined,
      };
      return apiRequest('POST', '/api/claims', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/claims"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Claim created successfully",
      });
      onSuccess();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You don't have permission to create claims.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create claim",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: ClaimFormData) => {
    createClaimMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="claimantName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Claimant Name *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter claimant's full name" 
                    {...field} 
                    data-testid="input-claimant-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="claimantFatherName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Father's Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter father's name" 
                    {...field} 
                    data-testid="input-father-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="claimantAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter full address" 
                  {...field} 
                  data-testid="input-address"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">State</label>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger data-testid="select-state">
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent>
                {states?.map((state: any) => (
                  <SelectItem key={state.id} value={state.id}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">District</label>
            <Select 
              value={selectedDistrict} 
              onValueChange={setSelectedDistrict}
              disabled={!selectedState}
            >
              <SelectTrigger data-testid="select-district">
                <SelectValue placeholder="Select District" />
              </SelectTrigger>
              <SelectContent>
                {districts?.map((district: any) => (
                  <SelectItem key={district.id} value={district.id}>
                    {district.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <FormField
            control={form.control}
            name="villageId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Village *</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                  disabled={!selectedDistrict}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-village">
                      <SelectValue placeholder="Select Village" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {villages?.map((village: any) => (
                      <SelectItem key={village.id} value={village.id}>
                        {village.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="claimType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Claim Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-claim-type">
                      <SelectValue placeholder="Select claim type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="IFR">Individual Forest Rights (IFR)</SelectItem>
                    <SelectItem value="CFR">Community Forest Resources (CFR)</SelectItem>
                    <SelectItem value="CR">Community Rights (CR)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="area"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Area (in acres)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="Enter area in acres" 
                    {...field} 
                    data-testid="input-area"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="coordinates"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Coordinates (GeoJSON)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder='{"type": "Point", "coordinates": [longitude, latitude]}' 
                  {...field} 
                  data-testid="input-coordinates"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Additional notes or remarks" 
                  {...field} 
                  data-testid="input-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createClaimMutation.isPending}
            data-testid="button-submit"
          >
            {createClaimMutation.isPending ? "Creating..." : "Create Claim"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
