import mongoose, { Schema, Document } from "mongoose";

export interface IProjectEntry {
  title: string;
  description?: string;
  technologies?: string[];
  link?: string;
  startDate?: string;
  endDate?: string;
}

export interface ICertificationEntry {
  name: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface IWorkExperience {
  company: string;
  role: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
}

export interface IEducation {
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
}

export interface IPersonalInfo {
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

export interface IResumeInfo {
  url: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
}

export interface IProfile extends Document {
  userId: string;
  personalInfo: IPersonalInfo;
  professionalSummary?: string;
  skills: string[];
  workExperience: IWorkExperience[];
  education: IEducation[];
  projects: IProjectEntry[];
  certifications: ICertificationEntry[];
  resume?: IResumeInfo;
  createdAt: Date;
  updatedAt: Date;
}

const PersonalInfoSchema = new Schema(
  {
    fullName: { type: String },
    email: { type: String },
    phone: { type: String },
    location: { type: String },
    links: {
      linkedin: { type: String },
      github: { type: String },
      portfolio: { type: String },
      twitter: { type: String },
    },
  },
  { _id: false }
);

const WorkExperienceSchema = new Schema(
  {
    company: { type: String, required: true },
    role: { type: String, required: true },
    location: { type: String },
    startDate: { type: String },
    endDate: { type: String },
    isCurrent: { type: Boolean, default: false },
    description: { type: String },
  },
  { _id: true }
);

const EducationSchema = new Schema(
  {
    institution: { type: String, required: true },
    degree: { type: String },
    fieldOfStudy: { type: String },
    startDate: { type: String },
    endDate: { type: String },
    gpa: { type: String },
  },
  { _id: true }
);

const ProjectSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    technologies: [{ type: String }],
    link: { type: String },
    startDate: { type: String },
    endDate: { type: String },
  },
  { _id: true }
);

const CertificationSchema = new Schema(
  {
    name: { type: String, required: true },
    issuer: { type: String },
    issueDate: { type: String },
    expiryDate: { type: String },
    credentialId: { type: String },
    credentialUrl: { type: String },
  },
  { _id: true }
);

const ResumeInfoSchema = new Schema(
  {
    url: { type: String, required: true },
    storagePath: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ProfileSchema = new Schema<IProfile>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    personalInfo: { type: PersonalInfoSchema, default: () => ({}) },
    professionalSummary: { type: String },
    skills: [{ type: String }],
    workExperience: [WorkExperienceSchema],
    education: [EducationSchema],
    projects: [ProjectSchema],
    certifications: [CertificationSchema],
    resume: { type: ResumeInfoSchema },
  },
  { timestamps: true }
);

export default mongoose.models.Profile ||
  mongoose.model<IProfile>("Profile", ProfileSchema);
