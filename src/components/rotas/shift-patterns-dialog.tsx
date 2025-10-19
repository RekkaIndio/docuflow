"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { ShiftPattern } from "./rotas-view";
import { SHIFT_COLOR_OPTIONS, ShiftColorKey } from "./shift-colors";
import { cn } from "@/lib/utils";
import { Trash2, Plus } from "lucide-react";

interface ShiftPatternsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patterns: ShiftPattern[];
  onSave: (patterns: ShiftPattern[]) => void;
}

interface ShiftPatternDraft extends ShiftPattern {
  isCodeLocked: boolean;
}

const DEFAULT_NEW_PATTERN: ShiftPatternDraft = {
  id: "CUSTOM",
  label: "Custom shift",
  startTime: "09:00",
  endTime: "17:00",
  color: "purple",
  description: "",
  isCodeLocked: false,
};

function sanitizeCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 12);
}

function isValidTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

export function ShiftPatternsDialog({ open, onOpenChange, patterns, onSave }: ShiftPatternsDialogProps) {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<ShiftPatternDraft[]>([]);

  useEffect(() => {
    if (!open) return;
    setDrafts(
      patterns.map((pattern) => ({
        ...pattern,
        isCodeLocked: true,
      }))
    );
  }, [open, patterns]);

  const codesInUse = useMemo(() => drafts.map((pattern) => pattern.id.toUpperCase()), [drafts]);

  const handleChange = (index: number, field: keyof ShiftPatternDraft, value: string) => {
    setDrafts((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value,
      };
      return copy;
    });
  };

  const handleAddPattern = () => {
    setDrafts((prev) => {
      let candidate = DEFAULT_NEW_PATTERN.id;
      let attempt = 1;
      const upperCodes = new Set(prev.map((pattern) => pattern.id.toUpperCase()));
      while (upperCodes.has(candidate.toUpperCase())) {
        candidate = `CUSTOM${attempt}`;
        attempt += 1;
      }

      return [
        ...prev,
        {
          ...DEFAULT_NEW_PATTERN,
          id: candidate,
          isCodeLocked: false,
        },
      ];
    });
  };

  const handleRemovePattern = (index: number) => {
    setDrafts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    if (drafts.length === 0) {
      toast({
        title: "Add at least one shift type",
        description: "You need one or more shift patterns for scheduling.",
        variant: "destructive",
      });
      return;
    }

    for (const draft of drafts) {
      const trimmedLabel = draft.label.trim();
      const sanitizedCode = sanitizeCode(draft.id);

      if (!sanitizedCode) {
        toast({
          title: "Short code required",
          description: "Add a brief code for each shift (e.g. AM, PM).",
          variant: "destructive",
        });
        return;
      }

      if (!trimmedLabel) {
        toast({
          title: "Label required",
          description: "Each shift needs a descriptive label.",
          variant: "destructive",
        });
        return;
      }

      if (!isValidTime(draft.startTime) || !isValidTime(draft.endTime)) {
        toast({
          title: "Invalid time format",
          description: "Use the HH:MM format for start and end times.",
          variant: "destructive",
        });
        return;
      }

      if (draft.startTime === draft.endTime) {
        toast({
          title: "Start and end times clash",
          description: "Choose distinct start and end times for each shift.",
          variant: "destructive",
        });
        return;
      }

      const duplicates = drafts.filter((candidate) => candidate.id.toUpperCase() === sanitizedCode);
      if (duplicates.length > 1) {
        toast({
          title: "Duplicate short code",
          description: `The code ${sanitizedCode} is used multiple times. Each shift needs a unique code.`,
          variant: "destructive",
        });
        return;
      }
    }

    const sanitized = drafts.map<ShiftPattern>((draft) => {
      const description = draft.description?.trim() || '';
      const base: ShiftPattern = {
        id: sanitizeCode(draft.id),
        label: draft.label.trim(),
        startTime: draft.startTime,
        endTime: draft.endTime,
        color: draft.color as ShiftColorKey,
      };
      return description ? { ...base, description } : base;
    });

    onSave(sanitized);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Shift type settings</DialogTitle>
          <DialogDescription>
            Configure the shift patterns available in your rota. Updating times here changes the defaults used when adding
            shifts.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[420px] pr-2">
          <div className="space-y-6 py-2">
            {drafts.map((pattern, index) => (
              <div key={pattern.id + index} className="rounded-lg border bg-background/60 p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor={`code-${index}`}>Short code</Label>
                        <Input
                          id={`code-${index}`}
                          value={pattern.id}
                          onChange={(event) => {
                            if (pattern.isCodeLocked) return;
                            handleChange(index, "id", sanitizeCode(event.target.value));
                          }}
                          disabled={pattern.isCodeLocked}
                        />
                        {pattern.isCodeLocked ? (
                          <p className="text-xs text-muted-foreground">
                            Existing shifts use this code. Remove and re-add if you need a different one.
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Set the code used inside the rota grid.</p>
                        )}
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor={`label-${index}`}>Display label</Label>
                        <Input
                          id={`label-${index}`}
                          value={pattern.label}
                          onChange={(event) => handleChange(index, "label", event.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor={`start-${index}`}>Start time</Label>
                        <Input
                          id={`start-${index}`}
                          type="time"
                          value={pattern.startTime}
                          onChange={(event) => handleChange(index, "startTime", event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`end-${index}`}>End time</Label>
                        <Input
                          id={`end-${index}`}
                          type="time"
                          value={pattern.endTime}
                          onChange={(event) => handleChange(index, "endTime", event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Colour</Label>
                        <Select
                          value={pattern.color}
                          onValueChange={(value) => handleChange(index, "color", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose colour" />
                          </SelectTrigger>
                          <SelectContent>
                            {SHIFT_COLOR_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "h-3 w-3 rounded-full border",
                                      option.value === "blue" && "bg-blue-500 border-blue-600",
                                      option.value === "amber" && "bg-amber-500 border-amber-600",
                                      option.value === "indigo" && "bg-indigo-500 border-indigo-600",
                                      option.value === "green" && "bg-green-500 border-green-600",
                                      option.value === "purple" && "bg-purple-500 border-purple-600",
                                      option.value === "teal" && "bg-teal-500 border-teal-600",
                                      option.value === "rose" && "bg-rose-500 border-rose-600",
                                      option.value === "slate" && "bg-slate-500 border-slate-600",
                                    )}
                                  />
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`description-${index}`}>Optional description</Label>
                      <Input
                        id={`description-${index}`}
                        value={pattern.description ?? ""}
                        onChange={(event) => handleChange(index, "description", event.target.value)}
                        placeholder="e.g. Handover shift"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemovePattern(index)}
                    disabled={drafts.length === 1}
                    className="mt-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={handleAddPattern} className="w-full border-dashed">
              <Plus className="mr-2 h-4 w-4" />
              Add shift pattern
            </Button>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save patterns
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
