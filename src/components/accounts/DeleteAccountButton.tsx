"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAccount } from "@/lib/actions";
import { useT } from "@/components/ui/LanguageSwitcher";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface DeleteAccountButtonProps {
  accountId: string;
  accountType: string;
  hasBalance: boolean;
}

export function DeleteAccountButton({ accountId, accountType, hasBalance }: DeleteAccountButtonProps) {
  const router = useRouter();
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [infoMsg, setInfoMsg] = useState("");

  async function handleDelete() {
    if (loading) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("accountId", accountId);
    const result = await deleteAccount(null, formData);
    setLoading(false);
    if (result?.success) {
      router.push("/dashboard");
      router.refresh();
    } else if (result?.error) {
      setInfoMsg(result.error);
      setShowModal(false);
    }
  }

  function handleClick() {
    if (hasBalance) {
      setInfoMsg(t("deleteAccount.nonzeroWarning"));
      return;
    }
    setShowModal(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-lg px-4 py-2 text-[11px] font-semibold text-white/15 hover:text-red-400 hover:bg-red-500/5 transition-all disabled:opacity-40"
      >
        {loading ? t("common.deleting") : t("common.deleteAccount")}
      </button>

      <ConfirmModal
        open={!!infoMsg}
        title={t("common.deleteAccount")}
        message={infoMsg}
        confirmLabel="OK"
        cancelLabel=""
        onConfirm={() => setInfoMsg("")}
        onCancel={() => setInfoMsg("")}
      />

      <ConfirmModal
        open={showModal && !infoMsg}
        title={t("common.deleteAccount")}
        message={`Delete this ${accountType} account permanently? This cannot be undone.`}
        confirmLabel={t("common.deleteAccount")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowModal(false)}
        loading={loading}
      />
    </>
  );
}
