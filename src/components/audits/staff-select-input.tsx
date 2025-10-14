"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { useWorkspaceStaff, type WorkspaceStaffMember } from "@/hooks/use-workspace-staff";

export type StaffSelectInputProps = React.ComponentProps<typeof Input> & {
  staffOptions?: WorkspaceStaffMember[];
};

export const StaffSelectInput = React.forwardRef<HTMLInputElement, StaffSelectInputProps>(
  ({ staffOptions, list, ...rest }, ref) => {
    const { staff } = useWorkspaceStaff();
    const resolvedStaff = staffOptions ?? staff;
    const generatedId = React.useId();
    const hasStaff = Array.isArray(resolvedStaff) && resolvedStaff.length > 0;
    const datalistId = hasStaff ? list ?? generatedId : list;

    return (
      <>
        <Input {...rest} ref={ref} list={datalistId} />
        {hasStaff && !list && (
          <datalist id={generatedId}>
            {resolvedStaff.map((member) => (
              <option key={member.id} value={member.name} />
            ))}
          </datalist>
        )}
      </>
    );
  }
);

StaffSelectInput.displayName = "StaffSelectInput";
