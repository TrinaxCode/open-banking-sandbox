"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { deleteUserAccount } from "@/lib/actions";
import { useT } from "@/components/ui/LanguageSwitcher";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

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
      setModalMsg(t(result.error));
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
        className="rounded-lg px-4 py-2 text-sm font-semibold text-white/15 hover:text-red-400 hover:bg-red-500/5 transition-all disabled:opacity-40"
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
