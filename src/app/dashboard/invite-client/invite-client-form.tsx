"use client";

import { useState, useTransition } from "react";
import { createClientInviteAction } from "./actions";

type ProjectOption = {
  id: string;
  name: string;
};

type FieldErrors = Partial<Record<"email" | "projectId", string[]>>;

type InviteClientFormProps = {
  projects: ProjectOption[];
  loadError?: string | null;
};

export default function InviteClientForm({
  projects,
  loadError = null,
}: InviteClientFormProps) {
  const [formError, setFormError] = useState<string | null>(loadError);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isDev = process.env.NODE_ENV !== "production";
  const hasProjects = projects.length > 0;
  const isDisabled = isPending || !hasProjects || Boolean(loadError);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isDisabled) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const submittedEmail = String(formData.get("email") || "").trim();

    startTransition(async () => {
      setFormError(loadError ?? null);
      setFieldErrors({});
      setInviteUrl(null);
      setSuccessEmail(null);
      setCopyStatus(null);
      setEmailWarning(null);

      try {
        const result = await createClientInviteAction(formData);

        if (!result.ok) {
          if (result.fieldErrors) {
            setFieldErrors(result.fieldErrors);
          }
          if (result.formError) {
            setFormError(result.formError);
          }
          return;
        }

        setInviteUrl(result.inviteUrl);
        setSuccessEmail(submittedEmail || null);
        setEmailWarning(result.emailError ?? null);
        form.reset();
      } catch (error) {
        console.error("invite client failed", error);
        setFormError("Something went wrong while creating the invite. Please try again.");
        setFieldErrors({});
        setInviteUrl(null);
        setSuccessEmail(null);
        setCopyStatus(null);
        setEmailWarning(null);
      }
    });
  }

  async function handleCopy() {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyStatus("Copied");
    } catch (error) {
      console.error("invite link copy failed", error);
      setCopyStatus("Copy failed");
    }
  }

  return (
    <div className="stack-4">
      <form onSubmit={handleSubmit} className="stack-4">
        {formError ? <p className="error-text">{formError}</p> : null}

        <div className="stack-2">
          <label htmlFor="projectId" className="label">
            Project
          </label>
          <select
            id="projectId"
            name="projectId"
            defaultValue=""
            disabled={isDisabled}
            className={`input${fieldErrors.projectId?.[0] ? " input-invalid" : ""}`}
          >
            <option value="" disabled>
              {hasProjects ? "Select a project" : "No projects available"}
            </option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {fieldErrors.projectId?.[0] ? (
            <p className="error-text">{fieldErrors.projectId[0]}</p>
          ) : null}
          {!hasProjects ? (
            <p className="help-text">
              Create a project first to invite a client.
            </p>
          ) : null}
        </div>

        <div className="stack-2">
          <label htmlFor="email" className="label">
            Client email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="client@company.com"
            autoComplete="email"
            disabled={isDisabled}
            className={`input${fieldErrors.email?.[0] ? " input-invalid" : ""}`}
          />
          {fieldErrors.email?.[0] ? (
            <p className="error-text">{fieldErrors.email[0]}</p>
          ) : null}
        </div>

        <button type="submit" className="btn-primary w-full" disabled={isDisabled}>
          {isPending ? "Creating invite..." : "Create invite"}
        </button>
      </form>

      {successEmail ? (
        <section className="stack-3">
          <div className="stack-2">
            <h2 className="section-title">Invitation created</h2>
            <p className="muted">
              {emailWarning
                ? "We couldn't send the email automatically."
                : `We've emailed ${successEmail} with the project invite.`}
            </p>
            {emailWarning ? (
              <p className="error-text">{emailWarning}</p>
            ) : null}
          </div>

          {isDev && inviteUrl ? (
            <div className="stack-2">
              <label htmlFor="invite-link" className="label">
                Invite link
              </label>
              <input
                id="invite-link"
                className="input"
                readOnly
                value={inviteUrl}
              />
              <button type="button" className="btn-secondary" onClick={handleCopy}>
                {copyStatus ?? "Copy link"}
              </button>
              <p className="help-text">
                This link is shown only once. Store it somewhere safe before
                leaving this page.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
