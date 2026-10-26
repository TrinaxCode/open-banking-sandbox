"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { deleteUserAccount } from "@/lib/actions";
import { useT } from "@/components/ui/LanguageSwitcher";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { TranslationKey } from "@/lib/i18n";

export function DeleteUserButton() {
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMsg, setModalMsg] = useState("");

  async function handleDelete() {
    if (loading) return;
    setLoading(true);
    const result = await deleteUserAccount();

    if (result?.error) {
      // The action returns a dictionary key, not free text.
      setModalMsg(t(result.error as TranslationKey));
      setLoading(false);
      return;
    }

    if (result?.success) {
      await signOut({ callbackUrl: "/login" });
    } else {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        disabled={loading}
        className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-red-600 hover:bg-red-500/10 border border-zinc-200 dark:border-white/5 dark:text-zinc-400 dark:hover:text-red-400 transition-all disabled:opacity-40"
      >
        {loading ? t("common.deleting") : t("profile.deleteAccount")}
      </button>

      {/* Info modal (error) */}
      <ConfirmModal
        open={!!modalMsg && !loading}
        title={t("profile.deleteAccount")}
        message={modalMsg}
        confirmLabel="OK"
        cancelLabel=""
        onConfirm={() => setModalMsg("")}
        onCancel={() => setModalMsg("")}
      />

      {/* Confirm modal */}
      <ConfirmModal
        open={showModal && !modalMsg}
        title={t("profile.deleteAccount")}
        message={t("deleteAccount.warning")}
        confirmLabel={t("profile.deleteAccount")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowModal(false)}
        loading={loading}
      />
    </>
  );
}
