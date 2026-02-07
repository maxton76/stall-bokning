import { useTranslation } from "react-i18next";
import { GripVertical, Scale, TrendingDown, RotateCw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { SelectionAlgorithm } from "@equiduty/shared";

interface AlgorithmInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAlgorithm?: SelectionAlgorithm;
}

const ALGORITHM_INFO = [
  { id: "manual" as const, i18nKey: "manual", icon: GripVertical },
  { id: "quota_based" as const, i18nKey: "quotaBased", icon: Scale },
  {
    id: "points_balance" as const,
    i18nKey: "pointsBalance",
    icon: TrendingDown,
  },
  { id: "fair_rotation" as const, i18nKey: "fairRotation", icon: RotateCw },
] as const;

const COMPARISON_ROWS = [
  "workload",
  "pickFairness",
  "transparency",
  "newMembers",
  "complexity",
  "bestFor",
] as const;

const COMPARISON_ALGORITHMS = [
  "quotaBased",
  "pointsBalance",
  "fairRotation",
] as const;

export function AlgorithmInfoSheet({
  open,
  onOpenChange,
  defaultAlgorithm,
}: AlgorithmInfoSheetProps) {
  const { t } = useTranslation(["selectionProcess"]);

  const defaultValue = defaultAlgorithm
    ? ALGORITHM_INFO.find((a) => a.id === defaultAlgorithm)?.id
    : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("selectionProcess:algorithm.help.title")}</SheetTitle>
          <SheetDescription>
            {t("selectionProcess:algorithm.help.description")}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Accordion type="single" collapsible defaultValue={defaultValue}>
            {ALGORITHM_INFO.map((algo) => {
              const Icon = algo.icon;
              return (
                <AccordionItem key={algo.id} value={algo.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-muted p-1.5">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span>
                        {t(`selectionProcess:algorithm.${algo.i18nKey}.name`)}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pl-10">
                      {/* How it works */}
                      <div>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {algo.id === "manual"
                            ? t(
                                "selectionProcess:algorithm.help.manual.howItWorks",
                              )
                            : t(
                                `selectionProcess:algorithm.help.${algo.i18nKey}.howItWorksSteps`,
                              )}
                        </p>
                      </div>

                      {/* When to use */}
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t(
                            `selectionProcess:algorithm.help.${algo.i18nKey}.whenToUse`,
                          )}
                        </p>
                      </div>

                      {/* What members see */}
                      <div>
                        <p className="text-sm text-muted-foreground italic">
                          {t(
                            `selectionProcess:algorithm.help.${algo.i18nKey}.whatMembersSee`,
                          )}
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {/* Comparison Table */}
          <div>
            <h3 className="text-sm font-semibold mb-3">
              {t("selectionProcess:algorithm.help.comparison.title")}
            </h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th
                      aria-label={t(
                        "selectionProcess:algorithm.help.comparison.title",
                      )}
                      className="text-left p-2 font-medium"
                    />
                    {COMPARISON_ALGORITHMS.map((algo) => (
                      <th
                        key={algo}
                        scope="col"
                        className="text-left p-2 font-medium"
                      >
                        {t(`selectionProcess:algorithm.${algo}.name`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row} className="border-b last:border-0">
                      <th
                        scope="row"
                        className="p-2 font-medium text-muted-foreground"
                      >
                        {t(`selectionProcess:algorithm.help.comparison.${row}`)}
                      </th>
                      {COMPARISON_ALGORITHMS.map((algo) => (
                        <td key={algo} className="p-2">
                          {t(
                            `selectionProcess:algorithm.help.comparison.${algo}.${row}`,
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
