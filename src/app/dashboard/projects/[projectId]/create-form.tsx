"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
    createApprovalItemFormAction,
    type CreateFormState,
} from "./actions";

// ---------------------------------------------------------------------------
// Submit button — reads pending state from the wrapping form
// ---------------------------------------------------------------------------
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            className="btn btn-primary"
            disabled={pending}
            aria-disabled={pending}
        >
            {pending ? "Creating…" : "Create draft"}
        </button>
    );
}

// ---------------------------------------------------------------------------
// CreateApprovalItemForm
// ---------------------------------------------------------------------------
export function CreateApprovalItemForm({ projectId }: { projectId: string }) {
    const [state, action] = useActionState<CreateFormState, FormData>(
        createApprovalItemFormAction,
        {},
    );
    const formRef = useRef<HTMLFormElement>(null);

    // Reset the form on success (state has no error and was set by an action)
    useEffect(() => {
        if (state && !state.error && formRef.current) {
            // Only reset when state was set by a successful action (not initial {})
            // We detect this by checking the form has been submitted at least once.
            // useActionState initialises to {} — after a successful run it also
            // returns {}. We rely on the page revalidation to show new items,
            // and just reset field values here.
            formRef.current.reset();
        }
    }, [state]);

    return (
        <div className="card">
            <div className="stack-4">
                <p className="section-title">New approval item</p>
                <form ref={formRef} action={action} className="stack-4">
                    <input type="hidden" name="projectId" value={projectId} />

                    <div className="stack-2">
                        <label className="label" htmlFor="ai-title">
                            Title
                        </label>
                        <input
                            className="input"
                            id="ai-title"
                            name="title"
                            placeholder="e.g. Homepage design approval"
                            required
                        />
                    </div>

                    <div className="stack-2">
                        <label className="label" htmlFor="ai-description">
                            Description
                        </label>
                        <input
                            className="input"
                            id="ai-description"
                            name="description"
                            placeholder="Optional details"
                        />
                    </div>

                    <div className="stack-2">
                        <label className="label" htmlFor="ai-dueAt">
                            Due date
                        </label>
                        <input
                            className="input"
                            id="ai-dueAt"
                            name="dueAt"
                            type="date"
                        />
                    </div>

                    {state?.error && (
                        <p className="text-error" role="alert">
                            {state.error}
                        </p>
                    )}

                    <SubmitButton />
                </form>
            </div>
        </div>
    );
}
