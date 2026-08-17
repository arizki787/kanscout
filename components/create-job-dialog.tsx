"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { useState } from "react";
import { createJobApplication } from "@/lib/actions/job-application";

const INITIAL_FORM_DATA = {
  company: "",
  position: "",
  location: "",
  notes: "",
  salary: "",
  jobUrl: "",
  tags: "",
  description: "",
};

interface CreateJobApplicationDialogProps {
  columnId: string;
  boardId: string;
  buttonVariant?: "outline" | "ghost";
  buttonLabel?: string;
  showLabel?: boolean;
  buttonClassName?: string;
}

interface FormDataType {
  company: string;
  position: string;
  location: string;
  notes: string;
  salary: string;
  jobUrl: string;
  tags: string;
  description: string;
}

function JobApplicationForm({
  formData,
  setFormData,
  onSubmit,
  onCancel,
}: {
  formData: FormDataType;
  setFormData: (data: FormDataType) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company">Company *</Label>
            <Input
              id="company"
              required
              value={formData.company}
              onChange={(e) =>
                setFormData({ ...formData, company: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Position *</Label>
            <Input
              id="position"
              required
              value={formData.position}
              onChange={(e) =>
                setFormData({ ...formData, position: e.target.value })
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salary">Salary</Label>
            <Input
              id="salary"
              placeholder="e.g., $100k - $150k"
              value={formData.salary}
              onChange={(e) =>
                setFormData({ ...formData, salary: e.target.value })
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="jobUrl">Job URL</Label>
          <Input
            id="jobUrl"
            placeholder="https://..."
            value={formData.jobUrl}
            onChange={(e) =>
              setFormData({ ...formData, jobUrl: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-seperated)</Label>
          <Input
            id="tags"
            placeholder="React, Tailwind, High Pay"
            value={formData.tags}
            onChange={(e) =>
              setFormData({ ...formData, tags: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={3}
            placeholder="Brief description of the role..."
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            rows={4}
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Add Application</Button>
      </DialogFooter>
    </form>
  );
}

function CreateJobApplicationDialog({
  columnId,
  boardId,
  buttonVariant = "outline",
  buttonLabel = "Add Job",
  showLabel = true,
  buttonClassName = "w-full mb-4 justify-start text-muted-foreground",
}: CreateJobApplicationDialogProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const result = await createJobApplication({
        ...formData,
        columnId,
        boardId,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
      });
      if (!result.error) {
        setFormData(INITIAL_FORM_DATA);
        setOpen(false);
      } else {
        console.error("Failed to create job: ", result.error);
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={buttonVariant} className={buttonClassName}>
            <Plus className="h-4 w-4" />
            {showLabel && <span className="ml-2">{buttonLabel}</span>}
          </Button>
        }
      ></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Job Application</DialogTitle>
          <DialogDescription>Track a new job application</DialogDescription>
        </DialogHeader>
        <JobApplicationForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export default CreateJobApplicationDialog;

// Convenience export for no-button variant
export function CreateJobApplicatDialogNoButton({
  columnId,
  boardId,
}: CreateJobApplicationDialogProps) {
  return (
    <CreateJobApplicationDialog
      columnId={columnId}
      boardId={boardId}
      buttonVariant="ghost"
      showLabel={false}
      buttonClassName="text-white justify-start"
    />
  );
}
