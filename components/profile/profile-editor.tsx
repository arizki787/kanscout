"use client";

import React, { useState, useRef, useTransition, useCallback } from "react";
import { saveProfile, removeResume } from "@/lib/actions/profile";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  FileText,
  X,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkExperience {
  _id?: string;
  company: string;
  role: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
}

interface Education {
  _id?: string;
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
}

interface Project {
  _id?: string;
  title: string;
  description?: string;
  technologies?: string[];
  link?: string;
  startDate?: string;
  endDate?: string;
}

interface Certification {
  _id?: string;
  name: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

interface PersonalInfo {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  links?: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
    twitter?: string;
  };
}

interface ResumeInfo {
  url: string;
  fileName: string;
  fileSize: number;
  storagePath: string;
  uploadedAt: string | Date;
}

interface ProfileData {
  personalInfo: PersonalInfo;
  professionalSummary?: string;
  skills: string[];
  workExperience: WorkExperience[];
  education: Education[];
  projects: Project[];
  certifications: Certification[];
  resume?: ResumeInfo | null;
}

interface ProfileEditorProps {
  initialProfile: ProfileData;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProfileEditor({ initialProfile }: ProfileEditorProps) {
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [skillInput, setSkillInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Personal Info ────────────────────────────────────────────────────────
  const updatePersonalInfo = useCallback((field: keyof PersonalInfo, value: string) => {
    setProfile((prev) => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value },
    }));
    setIsDirty(true);
  }, []);

  const updateLinks = useCallback((field: string, value: string) => {
    setProfile((prev) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        links: { ...prev.personalInfo?.links, [field]: value },
      },
    }));
    setIsDirty(true);
  }, []);

  // ── Skills ───────────────────────────────────────────────────────────────
  const addSkill = useCallback(() => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (profile.skills.includes(trimmed)) {
      setSkillInput("");
      return;
    }
    setProfile((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }));
    setSkillInput("");
    setIsDirty(true);
  }, [skillInput, profile.skills]);

  const removeSkill = useCallback((index: number) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  }, []);

  // ── Work Experience ──────────────────────────────────────────────────────
  const addWorkExperience = useCallback(() => {
    setProfile((prev) => ({
      ...prev,
      workExperience: [
        ...prev.workExperience,
        { company: "", role: "", isCurrent: false },
      ],
    }));
    setIsDirty(true);
  }, []);

  const updateWorkExperience = useCallback(
    (index: number, field: keyof WorkExperience, value: string | boolean) => {
      setProfile((prev) => {
        const updated = [...prev.workExperience];
        updated[index] = { ...updated[index], [field]: value };
        return { ...prev, workExperience: updated };
      });
      setIsDirty(true);
    },
    []
  );

  const removeWorkExperience = useCallback((index: number) => {
    setProfile((prev) => ({
      ...prev,
      workExperience: prev.workExperience.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  }, []);

  // ── Education ────────────────────────────────────────────────────────────
  const addEducation = useCallback(() => {
    setProfile((prev) => ({
      ...prev,
      education: [...prev.education, { institution: "" }],
    }));
    setIsDirty(true);
  }, []);

  const updateEducation = useCallback(
    (index: number, field: keyof Education, value: string) => {
      setProfile((prev) => {
        const updated = [...prev.education];
        updated[index] = { ...updated[index], [field]: value };
        return { ...prev, education: updated };
      });
      setIsDirty(true);
    },
    []
  );

  const removeEducation = useCallback((index: number) => {
    setProfile((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  }, []);

  // ── Projects ─────────────────────────────────────────────────────────────
  const addProject = useCallback(() => {
    setProfile((prev) => ({
      ...prev,
      projects: [...prev.projects, { title: "" }],
    }));
    setIsDirty(true);
  }, []);

  const updateProject = useCallback(
    (index: number, field: keyof Project, value: string | string[]) => {
      setProfile((prev) => {
        const updated = [...prev.projects];
        updated[index] = { ...updated[index], [field]: value };
        return { ...prev, projects: updated };
      });
      setIsDirty(true);
    },
    []
  );

  const removeProject = useCallback((index: number) => {
    setProfile((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  }, []);

  // ── Certifications ───────────────────────────────────────────────────────
  const addCertification = useCallback(() => {
    setProfile((prev) => ({
      ...prev,
      certifications: [...prev.certifications, { name: "" }],
    }));
    setIsDirty(true);
  }, []);

  const updateCertification = useCallback(
    (index: number, field: keyof Certification, value: string) => {
      setProfile((prev) => {
        const updated = [...prev.certifications];
        updated[index] = { ...updated[index], [field]: value };
        return { ...prev, certifications: updated };
      });
      setIsDirty(true);
    },
    []
  );

  const removeCertification = useCallback((index: number) => {
    setProfile((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  }, []);

  // ── Resume Upload ────────────────────────────────────────────────────────
  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await fetch("/api/profile/upload-resume", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");

      const { parsedData, resume } = json;
      setProfile((prev) => ({
        ...prev,
        resume,
        personalInfo: {
          ...prev.personalInfo,
          ...parsedData.personalInfo,
          links: {
            ...prev.personalInfo?.links,
            ...parsedData.personalInfo?.links,
          },
        },
        professionalSummary:
          parsedData.professionalSummary || prev.professionalSummary,
        skills: parsedData.skills?.length ? parsedData.skills : prev.skills,
        workExperience: parsedData.workExperience?.length
          ? parsedData.workExperience
          : prev.workExperience,
        education: parsedData.education?.length
          ? parsedData.education
          : prev.education,
        projects: parsedData.projects?.length
          ? parsedData.projects
          : prev.projects,
        certifications: parsedData.certifications?.length
          ? parsedData.certifications
          : prev.certifications,
      }));
      setUploadSuccess(
        "Resume parsed and profile auto-filled! Review each section and save your changes."
      );
      setIsDirty(true);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      // Reset the file input so the same file can be re-uploaded if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveResume() {
    await removeResume();
    setProfile((prev) => ({ ...prev, resume: null }));
    setIsDirty(true);
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  function handleSave() {
    startTransition(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await saveProfile(profile as any);
      if ("error" in result && result.error) {
        setSaveMessage("Error: " + result.error);
      } else {
        setSaveMessage("Profile saved successfully!");
        setIsDirty(false);
      }
      setTimeout(() => setSaveMessage(null), 4000);
    });
  }

  const sectionHeading = "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3";
  const fieldLabel = "text-xs font-medium text-gray-700";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review and edit the information extracted from your resume.
        </p>
      </div>

      {/* Resume Upload Section */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5">
        <p className={cn(sectionHeading, "mb-4")}>Resume</p>

        {/* Existing resume pill */}
        {profile.resume && (
          <div className="flex items-center gap-3 p-3 rounded-md bg-gray-50 border border-gray-200 mb-4">
            <FileText className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile.resume.fileName}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(profile.resume.fileSize)}
              </p>
            </div>
            <a
              href="/api/profile/resume"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
            >
              View <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveResume}
              className="text-red-500 hover:text-red-700 shrink-0 h-7 px-2"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        )}

        {/* Upload controls */}
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleResumeUpload}
            aria-label="Upload resume PDF"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Parsing resume with AI...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" aria-hidden="true" />
                {profile.resume ? "Replace Resume (PDF)" : "Upload Resume (PDF)"}
              </>
            )}
          </Button>
          <p className="text-xs text-gray-400">PDF only, max 10MB</p>
        </div>

        {/* Status banners */}
        {uploadSuccess && (
          <div className="mt-3 flex items-start gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-sm text-green-800">{uploadSuccess}</p>
          </div>
        )}
        {uploadError && (
          <div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-sm text-red-800">{uploadError}</p>
          </div>
        )}
      </div>

      {/* 7 Accordion Sections */}
      <Accordion defaultOpen={["personal-info"]}>
        {/* 1. Personal Information */}
        <AccordionItem id="personal-info" title="Personal Information">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className={fieldLabel}>Full Name</Label>
                <Input
                  value={profile.personalInfo?.fullName ?? ""}
                  onChange={(e) => updatePersonalInfo("fullName", e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-1">
                <Label className={fieldLabel}>Email</Label>
                <Input
                  type="email"
                  value={profile.personalInfo?.email ?? ""}
                  onChange={(e) => updatePersonalInfo("email", e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-1">
                <Label className={fieldLabel}>Phone</Label>
                <Input
                  value={profile.personalInfo?.phone ?? ""}
                  onChange={(e) => updatePersonalInfo("phone", e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="space-y-1">
                <Label className={fieldLabel}>Location</Label>
                <Input
                  value={profile.personalInfo?.location ?? ""}
                  onChange={(e) => updatePersonalInfo("location", e.target.value)}
                  placeholder="City, Country"
                />
              </div>
            </div>

            <div>
              <p className={cn(sectionHeading, "mt-2")}>Social &amp; Portfolio Links</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className={fieldLabel}>LinkedIn</Label>
                  <Input
                    value={profile.personalInfo?.links?.linkedin ?? ""}
                    onChange={(e) => updateLinks("linkedin", e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
                <div className="space-y-1">
                  <Label className={fieldLabel}>GitHub</Label>
                  <Input
                    value={profile.personalInfo?.links?.github ?? ""}
                    onChange={(e) => updateLinks("github", e.target.value)}
                    placeholder="https://github.com/username"
                  />
                </div>
                <div className="space-y-1">
                  <Label className={fieldLabel}>Portfolio Website</Label>
                  <Input
                    value={profile.personalInfo?.links?.portfolio ?? ""}
                    onChange={(e) => updateLinks("portfolio", e.target.value)}
                    placeholder="https://myportfolio.com"
                  />
                </div>
                <div className="space-y-1">
                  <Label className={fieldLabel}>Twitter / X</Label>
                  <Input
                    value={profile.personalInfo?.links?.twitter ?? ""}
                    onChange={(e) => updateLinks("twitter", e.target.value)}
                    placeholder="https://twitter.com/username"
                  />
                </div>
              </div>
            </div>
          </div>
        </AccordionItem>

        {/* 2. Professional Summary */}
        <AccordionItem id="professional-summary" title="Professional Summary">
          <div className="space-y-1">
            <Label className={fieldLabel}>Summary</Label>
            <Textarea
              rows={5}
              value={profile.professionalSummary ?? ""}
              onChange={(e) => {
                setProfile((prev) => ({
                  ...prev,
                  professionalSummary: e.target.value,
                }));
                setIsDirty(true);
              }}
              placeholder="Write a brief professional summary highlighting your expertise and career goals..."
            />
          </div>
        </AccordionItem>

        {/* 3. Skills */}
        <AccordionItem id="skills" title="Skills">
          <div className="space-y-3">
            {profile.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(i)}
                      className="ml-1 text-gray-400 hover:text-gray-700 transition-colors"
                      aria-label={`Remove ${skill}`}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Add a skill (press Enter or comma)"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSkill}
                className="flex items-center gap-1 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add Skill
              </Button>
            </div>
          </div>
        </AccordionItem>

        {/* 4. Work Experience */}
        <AccordionItem id="work-experience" title="Work Experience">
          <div className="space-y-4">
            {profile.workExperience.map((exp, i) => (
              <div
                key={i}
                className="relative rounded-md border border-gray-200 bg-gray-50 p-4"
              >
                <button
                  type="button"
                  onClick={() => removeWorkExperience(i)}
                  className="absolute right-3 top-3 text-red-400 hover:text-red-600 transition-colors"
                  aria-label="Remove work experience"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pr-8">
                  <div className="space-y-1">
                    <Label className={fieldLabel}>Company</Label>
                    <Input
                      value={exp.company}
                      onChange={(e) => updateWorkExperience(i, "company", e.target.value)}
                      placeholder="Company name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={fieldLabel}>Job Title / Role</Label>
                    <Input
                      value={exp.role}
                      onChange={(e) => updateWorkExperience(i, "role", e.target.value)}
                      placeholder="Software Engineer"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={fieldLabel}>Location</Label>
                    <Input
                      value={exp.location ?? ""}
                      onChange={(e) => updateWorkExperience(i, "location", e.target.value)}
                      placeholder="City, Country or Remote"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={fieldLabel}>Start Date</Label>
                    <Input
                      value={exp.startDate ?? ""}
                      onChange={(e) => updateWorkExperience(i, "startDate", e.target.value)}
                      placeholder="Jan 2022"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={cn(fieldLabel, exp.isCurrent && "text-gray-400")}>
                      End Date
                    </Label>
                    <Input
                      value={exp.endDate ?? ""}
                      onChange={(e) => updateWorkExperience(i, "endDate", e.target.value)}
                      placeholder="Dec 2023"
                      disabled={!!exp.isCurrent}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id={`current-${i}`}
                      checked={!!exp.isCurrent}
                      onChange={(e) => {
                        updateWorkExperience(i, "isCurrent", e.target.checked);
                        if (e.target.checked) {
                          updateWorkExperience(i, "endDate", "");
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary"
                    />
                    <label htmlFor={`current-${i}`} className={fieldLabel}>
                      Currently working here
                    </label>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <Label className={fieldLabel}>Key Achievements / Description</Label>
                  <Textarea
                    rows={3}
                    value={exp.description ?? ""}
                    onChange={(e) => updateWorkExperience(i, "description", e.target.value)}
                    placeholder="Describe your responsibilities and key achievements..."
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addWorkExperience}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add Work Experience
            </Button>
          </div>
        </AccordionItem>

        {/* 5. Education */}
        <AccordionItem id="education" title="Education">
          <div className="space-y-4">
            {profile.education.map((edu, i) => (
              <div
                key={i}
                className="relative rounded-md border border-gray-200 bg-gray-50 p-4"
              >
                <button
                  type="button"
                  onClick={() => removeEducation(i)}
                  className="absolute right-3 top-3 text-red-400 hover:text-red-600 transition-colors"
                  aria-label="Remove education"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pr-8">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className={fieldLabel}>Institution</Label>
                    <Input
                      value={edu.institution}
                      onChange={(e) => updateEducation(i, "institution", e.target.value)}
                      placeholder="University or School name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={fieldLabel}>Degree</Label>
                    <Input
                      value={edu.degree ?? ""}
                      onChange={(e) => updateEducation(i, "degree", e.target.value)}
                      placeholder="Bachelor of Science"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={fieldLabel}>Field of Study</Label>
                    <Input
                      value={edu.fieldOfStudy ?? ""}
                      onChange={(e) => updateEducation(i, "fieldOfStudy", e.target.value)}
                      placeholder="Computer Science"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={fieldLabel}>Start Year</Label>
                    <Input
                      value={edu.startDate ?? ""}
                      onChange={(e) => updateEducation(i, "startDate", e.target.value)}
                      placeholder="2018"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={fieldLabel}>End Year</Label>
                    <Input
                      value={edu.endDate ?? ""}
                      onChange={(e) => updateEducation(i, "endDate", e.target.value)}
                      placeholder="2022"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={fieldLabel}>GPA (optional)</Label>
                    <Input
                      value={edu.gpa ?? ""}
                      onChange={(e) => updateEducation(i, "gpa", e.target.value)}
                      placeholder="3.8 / 4.0"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEducation}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add Education
            </Button>
          </div>
        </AccordionItem>

        {/* 6. Projects */}
        <AccordionItem id="projects" title="Projects">
          <div className="space-y-4">
            {profile.projects.map((proj, i) => (
              <div
                key={i}
                className="relative rounded-md border border-gray-200 bg-gray-50 p-4"
              >
                <button
                  type="button"
                  onClick={() => removeProject(i)}
                  className="absolute right-3 top-3 text-red-400 hover:text-red-600 transition-colors"
                  aria-label="Remove project"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pr-8">
                  <div className="space-y-1">
                    <Label className={fieldLabel}>Project Title</Label>
                    <Input
                      value={proj.title}
                      onChange={(e) => updateProject(i, "title", e.target.value)}
                      placeholder="My Awesome Project"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={fieldLabel}>Project URL (optional)</Label>
                    <Input
                      value={proj.link ?? ""}
                      onChange={(e) => updateProject(i, "link", e.target.value)}
                      placeholder="https://github.com/user/project"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={fieldLabel}>Start Date (optional)</Label>
                    <Input
                      value={proj.startDate ?? ""}
                      onChange={(e) => updateProject(i, "startDate", e.target.value)}
                      placeholder="Jan 2023"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={fieldLabel}>End Date (optional)</Label>
                    <Input
                      value={proj.endDate ?? ""}
                      onChange={(e) => updateProject(i, "endDate", e.target.value)}
                      placeholder="Mar 2023 or Present"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className={fieldLabel}>
                      Technologies (comma-separated)
                    </Label>
                    <Input
                      value={(proj.technologies ?? []).join(", ")}
                      onChange={(e) =>
                        updateProject(
                          i,
                          "technologies",
                          e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean)
                        )
                      }
                      placeholder="React, TypeScript, Node.js"
                    />
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <Label className={fieldLabel}>Description</Label>
                  <Textarea
                    rows={3}
                    value={proj.description ?? ""}
                    onChange={(e) => updateProject(i, "description", e.target.value)}
                    placeholder="Briefly describe what you built and the impact..."
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addProject}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add Project
            </Button>
          </div>
        </AccordionItem>

        {/* 7. Certifications */}
        <AccordionItem id="certifications" title="Certifications">
          <div className="space-y-4">
            {profile.certifications.map((cert, i) => (
              <div
                key={i}
                className="relative rounded-md border border-gray-200 bg-gray-50 p-4"
              >
                <button
                  type="button"
                  onClick={() => removeCertification(i)}
                  className="absolute right-3 top-3 text-red-400 hover:text-red-600 transition-colors"
                  aria-label="Remove certification"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pr-8">
                  <div className="space-y-1">
                    <Label className={fieldLabel}>Certification Name</Label>
                    <Input
                      value={cert.name}
                      onChange={(e) => updateCertification(i, "name", e.target.value)}
                      placeholder="AWS Solutions Architect"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={fieldLabel}>Issuing Organization</Label>
                    <Input
                      value={cert.issuer ?? ""}
                      onChange={(e) => updateCertification(i, "issuer", e.target.value)}
                      placeholder="Amazon Web Services"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={fieldLabel}>Issue Date</Label>
                    <Input
                      value={cert.issueDate ?? ""}
                      onChange={(e) => updateCertification(i, "issueDate", e.target.value)}
                      placeholder="June 2023"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={fieldLabel}>Expiry Date (optional)</Label>
                    <Input
                      value={cert.expiryDate ?? ""}
                      onChange={(e) => updateCertification(i, "expiryDate", e.target.value)}
                      placeholder="June 2026 or No Expiry"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={fieldLabel}>Credential ID (optional)</Label>
                    <Input
                      value={cert.credentialId ?? ""}
                      onChange={(e) => updateCertification(i, "credentialId", e.target.value)}
                      placeholder="ABC-12345"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={fieldLabel}>Credential URL (optional)</Label>
                    <Input
                      value={cert.credentialUrl ?? ""}
                      onChange={(e) => updateCertification(i, "credentialUrl", e.target.value)}
                      placeholder="https://credential.example.com/verify"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCertification}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add Certification
            </Button>
          </div>
        </AccordionItem>
      </Accordion>

      {/* Save Bar */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <div>
          {saveMessage && (
            <p
              className={cn(
                "text-sm font-medium",
                saveMessage.startsWith("Error")
                  ? "text-red-600"
                  : "text-green-600"
              )}
            >
              {saveMessage.startsWith("Error") ? (
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  {saveMessage}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  {saveMessage}
                </span>
              )}
            </p>
          )}
        </div>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className={cn(!isDirty && "opacity-70")}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}
