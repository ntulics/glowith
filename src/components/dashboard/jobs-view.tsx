"use client";

import { useState } from "react";
import { Briefcase, Calendar, ChevronRight, Edit3, Loader2, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Applicant = { id: string; businessName: string; handle: string; avatarUrl: string | null; category: string };
type Application = { id: string; applicantId: string; coverLetter: string | null; status: string; createdAt: string; applicant: Applicant };
type Posting = {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  employmentType: string;
  salaryCents: number | null;
  salaryType: string | null;
  published: boolean;
  closingDate: string | null;
  createdAt: string;
  applications: Application[];
};
type AvailableJob = {
  id: string;
  title: string;
  description: string;
  employmentType: string;
  salaryCents: number | null;
  closingDate: string | null;
  provider: { businessName: string; handle: string; city: string | null; avatarUrl: string | null };
};

const ZAR = (c: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(c / 100);

export function JobsView({
  profileId,
  providerType,
  parentBusinessId,
  postings: initialPostings,
  availableJobs
}: {
  profileId: string;
  providerType: string;
  parentBusinessId: string | null;
  postings: Posting[];
  availableJobs: AvailableJob[];
}) {
  const isAgent = !!parentBusinessId;
  const isBusiness = providerType === "BUSINESS" || !isAgent;

  const [postings, setPostings] = useState<Posting[]>(initialPostings);
  const [tab, setTab] = useState<"my-jobs" | "browse">(isAgent ? "browse" : "my-jobs");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [employmentType, setEmploymentType] = useState("FULL_TIME");
  const [salary, setSalary] = useState("");
  const [salaryType, setSalaryType] = useState("MONTHLY");
  const [closingDate, setClosingDate] = useState("");

  // Application state
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [applying, setApplying] = useState(false);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  function resetForm() {
    setTitle(""); setDescription(""); setRequirements("");
    setEmploymentType("FULL_TIME"); setSalary(""); setSalaryType("MONTHLY");
    setClosingDate(""); setEditingId(null);
  }

  function openEdit(p: Posting) {
    setEditingId(p.id);
    setTitle(p.title);
    setDescription(p.description);
    setRequirements(p.requirements ?? "");
    setEmploymentType(p.employmentType);
    setSalary(p.salaryCents ? String(p.salaryCents / 100) : "");
    setSalaryType(p.salaryType ?? "MONTHLY");
    setClosingDate(p.closingDate ? p.closingDate.slice(0, 10) : "");
    setShowForm(true);
  }

  async function saveJob(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        profileId,
        title, description, requirements: requirements || null,
        employmentType,
        salaryCents: salary ? Math.round(parseFloat(salary) * 100) : null,
        salaryType: salary ? salaryType : null,
        closingDate: closingDate || null,
        ...(editingId ? { id: editingId } : {})
      };
      const res = await fetch("/api/jobs", { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) return;
      if (editingId) {
        setPostings((prev) => prev.map((p) => p.id === editingId ? { ...p, ...data.posting } : p));
      } else {
        setPostings((prev) => [{ ...data.posting, applications: [] }, ...prev]);
      }
      setShowForm(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function deleteJob(id: string) {
    if (!confirm("Delete this job posting?")) return;
    const res = await fetch(`/api/jobs?id=${id}`, { method: "DELETE" });
    if (res.ok) setPostings((prev) => prev.filter((p) => p.id !== id));
  }

  async function applyForJob(jobId: string) {
    setApplying(true);
    try {
      const res = await fetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobPostingId: jobId, applicantId: profileId, coverLetter: coverLetter || null })
      });
      if (res.ok) {
        setAppliedIds((prev) => new Set([...prev, jobId]));
        setApplyingJobId(null);
        setCoverLetter("");
      }
    } finally {
      setApplying(false);
    }
  }

  async function updateApplicationStatus(appId: string, status: string, postingId: string) {
    const res = await fetch(`/api/jobs/apply?id=${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      setPostings((prev) => prev.map((p) => p.id === postingId ? {
        ...p,
        applications: p.applications.map((a) => a.id === appId ? { ...a, status } : a)
      } : p));
    }
  }

  const STATUS_COLOR: Record<string, string> = {
    PENDING: "text-amber-700 bg-amber-50",
    REVIEWED: "text-blue-700 bg-blue-50",
    SHORTLISTED: "text-emerald-700 bg-emerald-50",
    REJECTED: "text-red-600 bg-red-50"
  };

  const EMPLOYMENT_LABELS: Record<string, string> = {
    FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract", FREELANCE: "Freelance"
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-black">Jobs</h1>
          <p className="text-xs text-gray-400">{isAgent ? "Browse and apply for positions" : "Post and manage job listings"}</p>
        </div>
        {!isAgent && (
          <button
            onClick={() => { setShowForm(true); resetForm(); }}
            className="flex items-center gap-2 rounded-xl bg-[#D94472] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#c03360] transition"
          >
            <Plus className="h-4 w-4" />
            Post a job
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Tabs for agents who are also businesses */}
        {!isAgent && (
          <div className="mb-6 flex gap-1 rounded-2xl border border-gray-200 bg-gray-50 p-1 max-w-xs">
            <button
              onClick={() => setTab("my-jobs")}
              className={cn("flex-1 rounded-xl py-2 text-sm font-semibold transition", tab === "my-jobs" ? "bg-white shadow text-gray-900" : "text-gray-500")}
            >
              My listings ({postings.length})
            </button>
            <button
              onClick={() => setTab("browse")}
              className={cn("flex-1 rounded-xl py-2 text-sm font-semibold transition", tab === "browse" ? "bg-white shadow text-gray-900" : "text-gray-500")}
            >
              Browse
            </button>
          </div>
        )}

        {/* My job listings */}
        {(tab === "my-jobs" || !isAgent) && tab === "my-jobs" && (
          <div className="space-y-4">
            {postings.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
                <Briefcase className="mb-3 h-10 w-10 text-gray-300" />
                <p className="font-bold text-gray-500">No job postings yet</p>
                <p className="text-sm text-gray-400 mt-1">Post a job to attract agents and freelancers</p>
              </div>
            )}
            {postings.map((p) => (
              <div key={p.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-gray-900">{p.title}</h3>
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                          {EMPLOYMENT_LABELS[p.employmentType] ?? p.employmentType}
                        </span>
                        {!p.published && <span className="rounded-full bg-amber-50 text-amber-700 px-2.5 py-0.5 text-xs font-bold">Draft</span>}
                      </div>
                      {p.salaryCents && (
                        <p className="mt-0.5 text-sm font-semibold text-[#D94472]">
                          {ZAR(p.salaryCents)} / {p.salaryType?.toLowerCase() ?? "month"}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">{p.description}</p>
                      {p.closingDate && (
                        <p className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Closes {new Date(p.closingDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(p)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteJob(p.id)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Applications */}
                {p.applications.length > 0 && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                      Applications ({p.applications.length})
                    </p>
                    <div className="space-y-3">
                      {p.applications.map((app) => (
                        <div key={app.id} className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D94472]/10 text-xs font-bold text-[#D94472]">
                            {app.applicant.businessName[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-gray-900">{app.applicant.businessName}</p>
                            <p className="text-xs text-gray-500">{app.applicant.category}</p>
                            {app.coverLetter && <p className="mt-1 text-xs text-gray-600 line-clamp-2">{app.coverLetter}</p>}
                          </div>
                          <select
                            value={app.status}
                            onChange={(e) => updateApplicationStatus(app.id, e.target.value, p.id)}
                            className={cn("rounded-lg border-0 px-2 py-1 text-xs font-bold outline-none cursor-pointer", STATUS_COLOR[app.status] ?? "")}
                          >
                            {["PENDING", "REVIEWED", "SHORTLISTED", "REJECTED"].map((s) => (
                              <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Browse jobs */}
        {tab === "browse" && (
          <div className="space-y-4">
            {availableJobs.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
                <Briefcase className="mb-3 h-10 w-10 text-gray-300" />
                <p className="font-bold text-gray-500">No job listings available</p>
              </div>
            )}
            {availableJobs.map((job) => (
              <div key={job.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-gray-900">{job.title}</h3>
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                        {EMPLOYMENT_LABELS[job.employmentType] ?? job.employmentType}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#D94472] mt-0.5">{job.provider.businessName}</p>
                    {job.provider.city && <p className="text-xs text-gray-400">{job.provider.city}</p>}
                    {job.salaryCents && <p className="mt-1 text-sm font-bold text-gray-700">{ZAR(job.salaryCents)}</p>}
                    <p className="mt-2 text-sm text-gray-600 line-clamp-3">{job.description}</p>
                    {job.closingDate && (
                      <p className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Closes {new Date(job.closingDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {appliedIds.has(job.id) ? (
                      <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Applied</span>
                    ) : (
                      <button
                        onClick={() => { setApplyingJobId(job.id); setCoverLetter(""); }}
                        className="flex items-center gap-1.5 rounded-xl bg-[#D94472] px-3 py-2 text-xs font-bold text-white hover:bg-[#c03360] transition"
                      >
                        Apply <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job posting form modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => { setShowForm(false); resetForm(); }} />
          <div className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 max-w-lg mx-auto rounded-3xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-black">{editingId ? "Edit job posting" : "Post a job"}</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={saveJob} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Job title *</label>
                <input
                  value={title} onChange={(e) => setTitle(e.target.value)} required
                  placeholder="e.g. Senior Hair Stylist"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#D94472]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Description *</label>
                <textarea
                  value={description} onChange={(e) => setDescription(e.target.value)} required rows={4}
                  placeholder="What does this role involve? What will they be doing day-to-day?"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#D94472] resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Requirements</label>
                <textarea
                  value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={3}
                  placeholder="Skills, qualifications, experience required..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#D94472] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Employment type</label>
                  <select
                    value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#D94472]"
                  >
                    {["FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE"].map((t) => (
                      <option key={t} value={t}>{EMPLOYMENT_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Salary (ZAR)</label>
                  <div className="flex gap-1">
                    <input
                      type="number" value={salary} onChange={(e) => setSalary(e.target.value)}
                      placeholder="e.g. 15000"
                      className="flex-1 min-w-0 rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-[#D94472]"
                    />
                    <select value={salaryType} onChange={(e) => setSalaryType(e.target.value)}
                      className="rounded-xl border border-gray-200 px-2 py-3 text-xs outline-none">
                      <option value="MONTHLY">/mo</option>
                      <option value="HOURLY">/hr</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Closing date</label>
                <input
                  type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#D94472]"
                />
              </div>
              <button
                type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#D94472] py-3 text-sm font-bold text-white hover:bg-[#c03360] disabled:opacity-60 transition"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Save changes" : "Post job"}
              </button>
            </form>
          </div>
        </>
      )}

      {/* Apply modal */}
      {applyingJobId && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setApplyingJobId(null)} />
          <div className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 max-w-sm mx-auto rounded-3xl bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black">Apply for position</h2>
              <button onClick={() => setApplyingJobId(null)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Cover letter (optional)</label>
                <textarea
                  value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={4}
                  placeholder="Tell them why you'd be a great fit..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#D94472] resize-none"
                />
              </div>
              <button
                onClick={() => applyForJob(applyingJobId)} disabled={applying}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#D94472] py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {applying && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit application
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
