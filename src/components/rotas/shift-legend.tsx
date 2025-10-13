"use client";

import { Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShiftPattern } from "./rotas-view";
import { getShiftColorTheme, DEFAULT_SHIFT_COLOR } from "./shift-colors";

interface ShiftLegendProps {
  patterns: ShiftPattern[];
  onEdit?: () => void;
}

const ANNUAL_LEAVE_THEME = {
  box: "border bg-orange-100 border-orange-300 text-orange-800",
  description: "Log hours away",
};

export function ShiftLegend({ patterns, onEdit }: ShiftLegendProps) {
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="w-4 h-4" />
          Shift Types Key
        </CardTitle>
        {onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit} className="flex items-center gap-2">
            <Pencil className="w-3 h-3" />
            Edit shift types
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {patterns.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No shift patterns configured yet.
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            {patterns.map((pattern, index) => {
              const theme = getShiftColorTheme(pattern.color ?? DEFAULT_SHIFT_COLOR);
              return (
                <Fragment key={pattern.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-12 h-8 rounded border text-xs font-semibold flex items-center justify-center",
                        theme.legendBox,
                        theme.legendBorder,
                        theme.legendText
                      )}
                    >
                      {pattern.id}
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">{pattern.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {pattern.startTime} - {pattern.endTime}
                      </div>
                    </div>
                  </div>
                  {index !== patterns.length - 1 && (
                    <div className="h-8 w-px bg-border hidden sm:block" />
                  )}
                </Fragment>
              );
            })}

            <div className="h-8 w-px bg-border hidden sm:block" />

            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-12 h-8 rounded border text-[10px] font-semibold flex items-center justify-center",
                  ANNUAL_LEAVE_THEME.box
                )}
              >
                Leave
              </div>
              <div className="text-sm">
                <div className="font-medium">Annual Leave</div>
                <div className="text-xs text-muted-foreground">{ANNUAL_LEAVE_THEME.description}</div>
              </div>
            </div>

            <div className="h-8 w-px bg-border hidden lg:block" />

            <div className="text-xs text-muted-foreground hidden lg:block">
              💡 Click any day card to add shifts or annual leave hours
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
