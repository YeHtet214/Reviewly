"use client";

import { useState, useTransition } from "react";
import { createInviteAction } from "./actions";

type FieldErrors = Partial<Record<"email" | "role", string[]>>;

export default function InviteMemberPage() {
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      setFormError(null);
      setFieldErrors({});
      setInviteUrl(null);
      setCopyStatus(null);

      try {
        const result = await createInviteAction(formData);

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
        form.reset();
      } catch (error) {
        console.error("invite member failed", error);
        setFormError("Something went wrong while creating the invite. Please try again.");
        setFieldErrors({});
        setInviteUrl(null);
        setCopyStatus(null);
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
    <main className="app-container">
      <div className="stack-6">
        <header className="stack-2">
          <h1 className="page-title">Invite member</h1>
          <p className="muted">
            Create a one-time invitation link for a new team member.
          </p>
        </header>

        <section className="card">
          <form onSubmit={handleSubmit} className="stack-4">
            {formError ? <p className="error-text">{formError}</p> : null}

            <div className="stack-2">
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="teammate@agency.com"
                autoComplete="email"
                className={`input${fieldErrors.email?.[0] ? " input-invalid" : ""}`}
              />
              {fieldErrors.email?.[0] ? (
                <p className="error-text">{fieldErrors.email[0]}</p>
              ) : null}
            </div>

            <div className="stack-2">
              <label htmlFor="role" className="label">
                Role
              </label>
              <select
                id="role"
                name="role"
                defaultValue="MEMBER"
                className={`input${fieldErrors.role?.[0] ? " input-invalid" : ""}`}
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
              {fieldErrors.role?.[0] ? (
                <p className="error-text">{fieldErrors.role[0]}</p>
              ) : null}
              <p className="help-text">
                Admins can manage members and agency settings.
              </p>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={isPending}>
              {isPending ? "Creating invite..." : "Create invite"}
            </button>
          </form>
        </section>

        {inviteUrl ? (
          <section className="card">
            <div className="stack-4">
              <div className="stack-2">
                <h2 className="section-title">Invite link</h2>
                <p className="muted">
                  Share this link with the person you want to invite.
                </p>
              </div>

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
                  This link is shown only once. Store it somewhere safe before leaving
                  this page.
                </p>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
