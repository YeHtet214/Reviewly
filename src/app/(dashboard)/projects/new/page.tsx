"use client";

import { useState, useTransition } from "react";
import { createProjectAction } from "./actions";
import type { CreateProjectFieldErrors } from "./actions";

export default function NewProjectPage() {
    const [formError, setFormError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<CreateProjectFieldErrors>({});
    const [isPending, startTransition] = useTransition();

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
            setFormError(null);
            setFieldErrors({});

            const result = await createProjectAction(formData);

            if (!result.ok) {
                if (result.fieldErrors) setFieldErrors(result.fieldErrors);
                if (result.formError) setFormError(result.formError);
            }
            // On success, the server action redirects — no client handling needed.
        });
    }

    return (
        <main className="app-container">
            <div className="stack-6">
                <header className="stack-2">
                    <h1 className="page-title">New project</h1>
                    <p className="muted">Fill in the details to create a new project.</p>
                </header>

                <section className="card">
                    <form onSubmit={handleSubmit} className="stack-4">
                        {formError ? <p className="error-text">{formError}</p> : null}

                        {/* Name */}
                        <div className="stack-2">
                            <label htmlFor="name" className="label">
                                Name <span aria-hidden="true">*</span>
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="e.g. Q3 Brand Refresh"
                                autoComplete="off"
                                className={`input${fieldErrors.name?.[0] ? " input-invalid" : ""}`}
                            />
                            {fieldErrors.name?.[0] ? (
                                <p className="error-text">{fieldErrors.name[0]}</p>
                            ) : null}
                        </div>

                        {/* Description */}
                        <div className="stack-2">
                            <label htmlFor="description" className="label">
                                Description
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                rows={3}
                                placeholder="Optional project description"
                                className={`textarea${fieldErrors.description?.[0] ? " input-invalid" : ""}`}
                            />
                            {fieldErrors.description?.[0] ? (
                                <p className="error-text">{fieldErrors.description[0]}</p>
                            ) : null}
                        </div>

                        {/* Due date */}
                        <div className="stack-2">
                            <label htmlFor="dueAt" className="label">
                                Due date
                            </label>
                            <input
                                id="dueAt"
                                name="dueAt"
                                type="date"
                                className={`input${fieldErrors.dueAt?.[0] ? " input-invalid" : ""}`}
                            />
                            {fieldErrors.dueAt?.[0] ? (
                                <p className="error-text">{fieldErrors.dueAt[0]}</p>
                            ) : null}
                        </div>

                        {/* Status */}
                        <div className="stack-2">
                            <label htmlFor="status" className="label">
                                Status
                            </label>
                            <select
                                id="status"
                                name="status"
                                defaultValue="ACTIVE"
                                className={`input${fieldErrors.status?.[0] ? " input-invalid" : ""}`}
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="ARCHIVED">Archived</option>
                            </select>
                            {fieldErrors.status?.[0] ? (
                                <p className="error-text">{fieldErrors.status[0]}</p>
                            ) : null}
                        </div>

                        <button
                            type="submit"
                            className="btn-primary w-full"
                            disabled={isPending}
                        >
                            {isPending ? "Creating project…" : "Create project"}
                        </button>
                    </form>
                </section>
            </div>
        </main>
    );
}
