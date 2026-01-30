import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { addComment } from "@/services/featureRequestService";

interface FeatureRequestCommentFormProps {
  requestId: string;
  onSuccess: () => void;
}

export function FeatureRequestCommentForm({
  requestId,
  onSuccess,
}: FeatureRequestCommentFormProps) {
  const { t } = useTranslation(["featureRequests", "common"]);
  const { toast } = useToast();
  const [body, setBody] = useState("");

  const mutation = useMutation({
    mutationFn: () => addComment(requestId, { body: body.trim() }),
    onSuccess: () => {
      setBody("");
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: t("common:errors.somethingWentWrong"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("featureRequests:placeholders.comment")}
        rows={3}
        disabled={mutation.isPending}
        aria-label={t("featureRequests:fields.comment")}
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={!body.trim() || mutation.isPending}
        >
          {mutation.isPending
            ? t("common:buttons.submitting")
            : t("featureRequests:addComment")}
        </Button>
      </div>
    </form>
  );
}
