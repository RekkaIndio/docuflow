"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

export function ShiftLegend() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="w-4 h-4" />
          Shift Types Key
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <div className="w-12 h-8 rounded bg-blue-100 border border-blue-300 flex items-center justify-center text-xs font-semibold text-blue-800">
              AM
            </div>
            <div className="text-sm">
              <div className="font-medium">Morning</div>
              <div className="text-xs text-muted-foreground">07:00 - 15:00</div>
            </div>
          </div>
          
          <div className="h-8 w-px bg-border hidden sm:block" />
          
          <div className="flex items-center gap-2">
            <div className="w-12 h-8 rounded bg-amber-100 border border-amber-300 flex items-center justify-center text-xs font-semibold text-amber-800">
              PM
            </div>
            <div className="text-sm">
              <div className="font-medium">Afternoon</div>
              <div className="text-xs text-muted-foreground">15:00 - 23:00</div>
            </div>
          </div>
          
          <div className="h-8 w-px bg-border hidden sm:block" />
          
          <div className="flex items-center gap-2">
            <div className="w-12 h-8 rounded bg-indigo-100 border border-indigo-300 flex items-center justify-center text-xs font-semibold text-indigo-800">
              Night
            </div>
            <div className="text-sm">
              <div className="font-medium">Night</div>
              <div className="text-xs text-muted-foreground">23:00 - 07:00</div>
            </div>
          </div>
          
          <div className="h-8 w-px bg-border hidden sm:block" />
          
          <div className="flex items-center gap-2">
            <div className="w-12 h-8 rounded bg-green-100 border border-green-300 flex items-center justify-center text-xs font-semibold text-green-800">
              Full
            </div>
            <div className="text-sm">
              <div className="font-medium">Full Day</div>
              <div className="text-xs text-muted-foreground">07:00 - 23:00</div>
            </div>
          </div>
          
          <div className="h-8 w-px bg-border hidden lg:block" />
          
          <div className="text-xs text-muted-foreground hidden lg:block">
            💡 Click any day card to add shifts
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
