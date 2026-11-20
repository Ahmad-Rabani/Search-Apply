export type Preferences = {
  roles: string[];
  locations: string[];
  remoteOnly: boolean;
  minSalary: number;
  keywords: string[];
};

export type User = {
  id?: string;
  _id?: string;
  email: string;
  name?: string;
  preferences?: Preferences;
};

export type Experience = {
  title?: string;
  company?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  bullets?: string[];
};

export type Education = {
  school?: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
};

export type Project = {
  name?: string;
  url?: string;
  description?: string;
  tech?: string[];
};

export type Profile = {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  summary: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
};

export type Job = {
  _id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  tags: string[];
  salaryMin?: number;
  salaryMax?: number;
  remote?: boolean;
  relevanceScore?: number;
  postedAt?: string;
};

export type TailoredDoc = {
  _id: string;
  matchScore: number;
  keywords: string[];
  missingSkills: string[];
  coverLetter: string;
  cvMarkdown: string;
  cvHtml: string;
  atsNotes: string;
};

export type InterviewPrep = {
  _id: string;
  companyBrief: string;
  roleFocus: string[];
  likelyQuestions: Array<{ question: string; tip: string }>;
  storiesToPrepare: Array<{ theme: string; howToAnswer: string }>;
  questionsToAsk: string[];
  risks: string[];
};

export type Application = {
  _id: string;
  status: "saved" | "tailored" | "applied" | "interview" | "offer" | "rejected";
  notes: string;
  appliedAt?: string;
  applyAssistAt?: string;
  confirmationScreenshot?: string;
  jobId: Job | string;
  tailoredDocId?: TailoredDoc | string;
  updatedAt?: string;
};
