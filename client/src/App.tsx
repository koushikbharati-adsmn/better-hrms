import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useRef, useState } from "react";
import { Trash2, Plus, Upload, Send, EyeOff, Eye, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import DatePicker from "@/components/ui/date-picker";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import useSpeechToText from "./hooks/use-speech-to-text";
import { format } from "date-fns";

const entrySchema = z.object({
  date: z.string().min(1, "Date required"),
  hours: z.number().min(1, "Min 1h"),
  task: z.string().min(1, "Task required"),
});

const formSchema = z.object({
  managerId: z.string().min(1, "Required"),
  projectId: z.string().min(1, "Required"),
  entries: z.array(entrySchema).min(1, "Add at least one entry"),
});

const credentialsSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(6, "Min 6 characters"),
});

function parseCSV(text: string) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const di = headers.indexOf("date"),
    hi = headers.indexOf("hours"),
    ti = headers.indexOf("task");
  if (di === -1 || hi === -1 || ti === -1)
    throw new Error("CSV must have columns: date, hours, task");
  return lines.slice(1).map((line, i) => {
    const cols: string[] = [];
    let cur = "",
      inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) {
        cols.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
    cols.push(cur.trim());
    const hours = parseFloat(cols[hi]);
    if (isNaN(hours)) throw new Error(`Row ${i + 2}: invalid hours`);
    return { date: cols[di] ?? "", hours, task: cols[ti] ?? "" };
  });
}

function FieldError({ errors }: { errors?: { message: string }[] }) {
  if (!errors?.[0]) return null;
  return (
    <p className="mt-1 text-xs text-red-400 leading-none">
      {errors[0].message}
    </p>
  );
}

interface SubmitDialogProps {
  isLoading: boolean;
  open: boolean;
  onClose: () => void;
  onConfirm: (email: string, password: string) => void;
}

function SubmitDialog({
  open,
  onClose,
  onConfirm,
  isLoading,
}: SubmitDialogProps) {
  const [showPassword, setShowPassword] = useState(false);

  // TanStack Form managing the email + password fields inside the dialog
  const credForm = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: credentialsSchema },
    onSubmit: async ({ value }) => {
      onConfirm(value.email, value.password);
    },
  });

  function handleClose() {
    credForm.reset();
    setShowPassword(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirm your identity</DialogTitle>
          <DialogDescription>
            Sign in to submit your timesheet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <credForm.Field name="email">
            {(field) => (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  onKeyDown={(e) =>
                    e.key === "Enter" && credForm.handleSubmit()
                  }
                  placeholder="Your email"
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-sm text-zinc-800 outline-none transition-colors",
                    field.state.meta.errors?.length
                      ? "border-red-300 focus:border-red-400 bg-red-50/30"
                      : "border-zinc-200 focus:border-zinc-400",
                  )}
                />
                <FieldError errors={field.state.meta.errors as any} />
              </div>
            )}
          </credForm.Field>

          <credForm.Field name="password">
            {(field) => (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    onKeyDown={(e) =>
                      e.key === "Enter" && credForm.handleSubmit()
                    }
                    placeholder="Your password"
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 pr-10 text-sm text-zinc-800 outline-none transition-colors",
                      field.state.meta.errors?.length
                        ? "border-red-300 focus:border-red-400 bg-red-50/30"
                        : "border-zinc-200 focus:border-zinc-400",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <FieldError errors={field.state.meta.errors as any} />
              </div>
            )}
          </credForm.Field>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 h-9 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <credForm.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <button
                type="button"
                disabled={!canSubmit || isLoading}
                onClick={() => credForm.handleSubmit()}
                className={cn(
                  "flex items-center gap-2 px-5 h-9 rounded-lg text-sm font-medium transition-colors",
                  canSubmit
                    ? "bg-zinc-900 text-white hover:bg-zinc-700"
                    : "bg-zinc-100 text-zinc-400 cursor-not-allowed",
                )}
              >
                <Send className="h-3.5 w-3.5" />
                {isSubmitting || isLoading ? "Submitting…" : "Submit"}
              </button>
            )}
          </credForm.Subscribe>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TaskCellProps {
  value: string;
  onChange: (v: string) => void;
  errors?: { message: string }[];
}

function TaskCell({ value, onChange, errors }: TaskCellProps) {
  const { listening, supported, start, stop } = useSpeechToText(
    (transcript) => {
      onChange(value ? `${value} ${transcript}` : transcript);
    },
  );

  return (
    <div className="flex items-start gap-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={1}
        placeholder="Describe the work done…"
        className="flex-1 text-sm leading-relaxed text-zinc-800 bg-transparent outline-none resize-none placeholder:text-zinc-400"
        onInput={(e) => {
          const t = e.currentTarget;
          t.style.height = "auto";
          t.style.height = t.scrollHeight + "px";
        }}
      />
      {supported && (
        <button
          type="button"
          title="Hold to speak"
          onMouseDown={start}
          onMouseUp={stop}
          onMouseLeave={stop}
          onTouchStart={(e) => {
            e.preventDefault();
            start();
          }}
          onTouchEnd={stop}
          className={cn(
            "mt-0.5 shrink-0 select-none rounded-md p-1.5 transition-all",
            listening
              ? "bg-red-50 text-red-500 ring-1 ring-red-200 scale-110"
              : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-500",
          )}
        >
          <Mic className="h-3.5 w-3.5" />
        </button>
      )}
      {errors?.[0] && (
        <p className="mt-1 text-xs text-red-400 leading-none">
          {errors[0].message}
        </p>
      )}
    </div>
  );
}

function TimesheetForm() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: {
      managerId: "",
      projectId: "",
      entries: [{ date: "", hours: 8, task: "" }],
    },
    validators: { onSubmit: formSchema },
    onSubmit: () => setDialogOpen(true),
  });

  function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target?.result as string);
        if (!parsed.length) {
          alert("No entries found.");
          return;
        }
        form.setFieldValue("entries", parsed);
      } catch (err) {
        toast.error(`CSV error: ${(err as Error).message}`);
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  async function handleDialogConfirm(email: string, password: string) {
    const formData = form.state.values;

    const payload = {
      email,
      password,
      data: formData.entries.map(({ date, hours, task }) => ({
        project_manager_id: formData.managerId,
        project_id: formData.projectId,
        start_date: format(date, "dd-MM-yyyy"),
        total_hours: hours,
        task: task,
      })),
    };

    console.log("Payload:", payload);

    try {
      setIsLoading(true);
      const res = await fetch(
        "https://4wwwxm3tj8.execute-api.ap-south-1.amazonaws.com/submit-timesheet",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to submit timesheet");
      }

      const data = await res.json();
      console.log("Response:", data);
      toast.success("Timesheet submitted successfully!");
      setDialogOpen(false);
      form.reset();
    } catch (err) {
      console.error("Error submitting timesheet:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <SubmitDialog
        isLoading={isLoading}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleDialogConfirm}
      />

      <div className="flex flex-col h-screen bg-white overflow-hidden">
        <header className="shrink-0 border-b  bg-white">
          <div className="mx-auto max-w-6xl px-10">
            <div className="flex items-center justify-between py-4 border-b ">
              <div className="flex items-baseline gap-3">
                <h1 className="text-base font-semibold tracking-tight text-zinc-700">
                  Timesheet
                </h1>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x">
              {(["managerId", "projectId"] as const).map((name) => (
                <form.Field key={name} name={name}>
                  {(field) => (
                    <div
                      className={cn("py-3", name === "projectId" && "pl-10")}
                    >
                      <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-700 mb-1">
                        {name === "managerId" ? "Manager ID" : "Project ID"}
                      </label>
                      <input
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder={
                          name === "managerId" ? "MGR-001" : "PRJ-2026"
                        }
                        className="w-full text-sm text-zinc-800 bg-transparent outline-none"
                      />
                      <FieldError errors={field.state.meta.errors as any} />
                    </div>
                  )}
                </form.Field>
              ))}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-10">
            <form.Field name="entries" mode="array">
              {(field) => (
                <table className="w-full">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b ">
                      <th className="w-48 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-zinc-700 pr-8">
                        Date
                      </th>
                      <th className="w-28 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-zinc-700 px-8">
                        Hours
                      </th>
                      <th className="py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-zinc-700 pl-8">
                        Task
                      </th>
                      <th className="w-10 py-3.5" />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-zinc-100">
                    {field.state.value.map((_, index) => (
                      <tr key={index} className="group align-top">
                        <td className="py-4 pr-8">
                          <form.Field name={`entries[${index}].date`}>
                            {(sf) => (
                              <>
                                <DatePicker
                                  value={sf.state.value}
                                  onChange={sf.handleChange}
                                />
                                <FieldError
                                  errors={sf.state.meta.errors as any}
                                />
                              </>
                            )}
                          </form.Field>
                        </td>
                        <td className="py-4 px-8">
                          <form.Field name={`entries[${index}].hours`}>
                            {(sf) => (
                              <>
                                <div className="flex items-baseline gap-1.5">
                                  <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    value={sf.state.value}
                                    onChange={(e) =>
                                      sf.handleChange(
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                    className="w-12 text-sm text-zinc-800 bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                  />
                                  <span className="text-xs text-zinc-400">
                                    hrs
                                  </span>
                                </div>
                                <FieldError
                                  errors={sf.state.meta.errors as any}
                                />
                              </>
                            )}
                          </form.Field>
                        </td>
                        <td className="py-4 pl-8">
                          <form.Field name={`entries[${index}].task`}>
                            {(sf) => (
                              <TaskCell
                                value={sf.state.value}
                                onChange={sf.handleChange}
                                errors={sf.state.meta.errors as any}
                              />
                            )}
                          </form.Field>
                        </td>
                        <td className="py-4 pl-3">
                          <button
                            type="button"
                            onClick={() => field.removeValue(index)}
                            className="rounded p-1.5 text-zinc-400 transition-all hover:bg-red-50 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {field.state.value.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-20 text-center text-sm text-zinc-400"
                        >
                          No entries yet.{" "}
                          <button
                            type="button"
                            className="text-zinc-700 underline underline-offset-2 hover:text-zinc-800"
                            onClick={() =>
                              field.pushValue({ date: "", hours: 8, task: "" })
                            }
                          >
                            Add one
                          </button>{" "}
                          or import a CSV.
                        </td>
                      </tr>
                    )}
                  </tbody>

                  <tfoot>
                    <tr className="border-t">
                      <td colSpan={4} className="py-3">
                        <div className="flex items-center gap-5">
                          <button
                            type="button"
                            onClick={() =>
                              field.pushValue({ date: "", hours: 8, task: "" })
                            }
                            className="flex items-center gap-2 text-sm text-zinc-700 transition-colors hover:text-zinc-800"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add entry
                          </button>
                          <span className="text-zinc-400 text-sm">·</span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={handleCSVImport}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 text-sm text-zinc-700 transition-colors hover:text-zinc-800"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            Import CSV
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </form.Field>
          </div>
        </main>

        <footer className="shrink-0 border-t  bg-white">
          <div className="mx-auto max-w-6xl px-10 py-4 flex items-center justify-between gap-6">
            <form.Subscribe selector={(s) => s.values.entries}>
              {(entries) => {
                const total = entries.reduce((s, e) => s + (e.hours || 0), 0);
                return (
                  <div className="flex items-baseline gap-5">
                    <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                      Total
                    </span>
                    <span className="text-base font-semibold text-zinc-800 tabular-nums">
                      {total}h
                    </span>
                    <span className="text-sm text-zinc-400">
                      {entries.length}{" "}
                      {entries.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                );
              }}
            </form.Subscribe>

            <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={() => form.handleSubmit()}
                  className={cn(
                    "flex items-center gap-2 px-6 h-9 rounded text-sm font-medium transition-colors",
                    canSubmit
                      ? "bg-zinc-900 text-white hover:bg-zinc-700"
                      : "bg-zinc-100 text-zinc-400 cursor-not-allowed",
                  )}
                >
                  <Send className="h-3.5 w-3.5" />
                  {isSubmitting ? "Submitting…" : "Submit"}
                </button>
              )}
            </form.Subscribe>
          </div>
        </footer>
      </div>
    </>
  );
}

export default function App() {
  return <TimesheetForm />;
}
