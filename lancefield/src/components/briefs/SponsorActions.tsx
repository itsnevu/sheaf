"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client";
import { plural } from "@/lib/format";

/**
 * Sponsor-only controls on a brief page. Every action posts to the site's own /api routes,
 * refreshes the server-rendered page on success and reports the API's message on failure.
 */

function errorMessage(e: unknown): string {
  return e instanceof Error && e.message ? e.message : "Something went wrong. Try again.";
}

/** Native <dialog> confirm. Focus moves to Cancel on open and back to the opener on close; Esc closes unless a request is running. */
export function ConfirmDialog({ open, title, children, confirmLabel, tone = "primary", busy, onConfirm, onClose }: { open: boolean; title: string; children: ReactNode; confirmLabel: string; tone?: "primary" | "moss" | "danger"; busy: boolean; onConfirm: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      if (!d.open) {
        opener.current = document.activeElement;
        d.showModal();
      }
      cancelRef.current?.focus();
    } else {
      if (d.open) d.close();
      const el = opener.current as HTMLElement | null;
      opener.current = null;
      el?.focus?.();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onClose={onClose}
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
      className="w-[min(92vw,28rem)] rounded-lg border border-line bg-paper p-0 text-ink shadow-lift backdrop:bg-ink/40"
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) onConfirm();
        }}
        className="p-6"
      >
        <h2 id={titleId} className="t-display-sm text-ink">
          {title}
        </h2>
        <div id={bodyId} className="t-body mt-2">
          {children}
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button ref={cancelRef} type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <Button type="submit" variant={tone} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

/** Per-entry controls: pick as winner (with confirm), hide, restore. */
export function EntryActions({ briefId, entryId, agentHandle, hidden, isWinner, canJudge }: { briefId: string; entryId: string; agentHandle: string; hidden: boolean; isWinner: boolean; canJudge: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<"winner" | "hide" | null>(null);

  const pickWinner = async () => {
    setBusy("winner");
    try {
      await api(`/api/briefs/${briefId}/winner`, { json: { entryId } });
      setConfirm(false);
      toast(`${agentHandle} is the winner. Settlement is recorded as pending.`, "success");
      router.refresh();
    } catch (e) {
      toast(errorMessage(e), "danger");
    } finally {
      setBusy(null);
    }
  };

  const toggleHidden = async () => {
    setBusy("hide");
    try {
      await api(`/api/briefs/${briefId}/hide`, { json: { entryId, hidden: !hidden } });
      toast(hidden ? "Entry restored to the field." : "Entry hidden. Visitors no longer see it.", "success");
      router.refresh();
    } catch (e) {
      toast(errorMessage(e), "danger");
    } finally {
      setBusy(null);
    }
  };

  const showPick = canJudge && !hidden;
  const showHide = canJudge && !hidden && !isWinner;
  if (!showPick && !showHide && !hidden) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showPick && (
        <Button variant="moss" size="sm" onClick={() => setConfirm(true)} disabled={busy !== null}>
          Pick as winner
        </Button>
      )}
      {hidden ? (
        <Button variant="secondary" size="sm" onClick={toggleHidden} loading={busy === "hide"}>
          Restore
        </Button>
      ) : showHide ? (
        <Button variant="ghost" size="sm" onClick={toggleHidden} loading={busy === "hide"}>
          Hide
        </Button>
      ) : null}
      {showPick && (
        <ConfirmDialog
          open={confirm}
          title="Pick this entry as the winner?"
          confirmLabel="Pick as winner"
          tone="moss"
          busy={busy === "winner"}
          onConfirm={pickWinner}
          onClose={() => {
            if (busy !== "winner") setConfirm(false);
          }}
        >
          <p>
            The brief closes and <strong className="text-ink">{agentHandle}</strong> is recorded as the winner. This cannot be undone.
          </p>
          <p className="mt-2">No funds move here. Settlement is off-platform in this build and is shown as pending.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

/** Settles the brief with no winner. */
export function CloseBriefAction({ briefId, entryCount }: { briefId: string; entryCount: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const close = async () => {
    setBusy(true);
    try {
      await api(`/api/briefs/${briefId}/winner`, { json: { entryId: null } });
      setConfirm(false);
      toast("Brief closed without a winner.", "success");
      router.refresh();
    } catch (e) {
      toast(errorMessage(e), "danger");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setConfirm(true)}>
        Close without a winner
      </Button>
      <ConfirmDialog
        open={confirm}
        title="Close this brief without a winner?"
        confirmLabel="Close brief"
        tone="danger"
        busy={busy}
        onConfirm={close}
        onClose={() => {
          if (!busy) setConfirm(false);
        }}
      >
        <p>The brief is marked settled with no winner and no prize is owed. {entryCount > 0 ? `The ${plural(entryCount, "entry", "entries")} handed in stay visible for the record.` : "Nothing was handed in."} This cannot be undone.</p>
      </ConfirmDialog>
    </>
  );
}
