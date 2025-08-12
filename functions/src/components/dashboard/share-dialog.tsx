import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Globe, Link as LinkIcon, UserPlus } from "lucide-react";
import { mockUser } from "@/lib/data";

interface ShareDialogProps {
    children: React.ReactNode;
}

export function ShareDialog({ children }: ShareDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Share Document</DialogTitle>
          <DialogDescription>
            Invite team members to collaborate. Anyone with the link can view.
          </DialogDescription>
        </DialogHeader>
        <div className="flex space-x-2">
          <Input placeholder="Enter emails..." />
          <Button variant="default">
            <UserPlus className="mr-2 h-4 w-4" />
            Invite
          </Button>
        </div>
        <div className="space-y-4 pt-4">
            <h3 className="text-sm font-medium">People with access</h3>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={mockUser.avatarUrl} />
                        <AvatarFallback>{mockUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-medium">{mockUser.name} (You)</p>
                        <p className="text-sm text-muted-foreground">{mockUser.email}</p>
                    </div>
                </div>
                <span className="text-sm text-muted-foreground">Owner</span>
            </div>
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src="https://i.pravatar.cc/150?u=jane" />
                        <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-medium">Jane Doe</p>
                        <p className="text-sm text-muted-foreground">jane.d@example.com</p>
                    </div>
                </div>
                <Select defaultValue="editor">
                    <SelectTrigger className="w-[110px]">
                        <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
        <div className="border-t pt-4 mt-2 space-y-2">
            <div className="flex items-center gap-3">
                 <div className="p-2 bg-muted rounded-full">
                    <Globe className="h-5 w-5" />
                 </div>
                 <div>
                    <p className="font-medium">General access</p>
                    <p className="text-sm text-muted-foreground">Anyone with the link can view</p>
                 </div>
            </div>
             <Button variant="outline" className="w-full justify-start">
                <LinkIcon className="mr-2 h-4 w-4" />
                Copy link
             </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
