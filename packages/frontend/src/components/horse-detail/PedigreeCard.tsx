import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GitBranch,
  Search,
  ExternalLink,
  Info,
  AlertCircle,
  Loader2,
  Edit,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { authFetch } from "@/lib/authFetch";
import type { Horse } from "@/types/roles";
import type {
  HorsePedigree,
  PedigreeAncestor,
  HorseTelexSearchResult,
  countPedigreeGenerations,
  countPedigreeAncestors,
} from "@shared/types/pedigree";

interface PedigreeCardProps {
  horse: Horse;
}

interface PedigreeData extends HorsePedigree {
  id?: string;
  horseId?: string;
}

// Component to display a single ancestor box
function AncestorBox({
  ancestor,
  label,
  generation,
}: {
  ancestor?: PedigreeAncestor;
  label: string;
  generation: number;
}) {
  const { t } = useTranslation(["horses"]);

  if (!ancestor) {
    return (
      <div
        className={`border border-dashed rounded p-2 text-center text-muted-foreground text-xs
          ${generation === 1 ? "min-h-[60px]" : generation === 2 ? "min-h-[50px]" : "min-h-[40px]"}`}
      >
        {t("horses:pedigree.unknown", "Unknown")}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`border rounded p-2 bg-card hover:bg-accent/50 transition-colors cursor-pointer
              ${generation === 1 ? "min-h-[60px]" : generation === 2 ? "min-h-[50px]" : "min-h-[40px]"}`}
          >
            <div
              className={`font-medium truncate ${generation === 1 ? "text-sm" : "text-xs"}`}
            >
              {ancestor.name}
            </div>
            {generation <= 2 && (
              <div className="text-xs text-muted-foreground truncate mt-1">
                {ancestor.breed && <span>{ancestor.breed}</span>}
                {ancestor.birthYear && (
                  <span className="ml-1">({ancestor.birthYear})</span>
                )}
              </div>
            )}
            {ancestor.horseTelexUrl && (
              <a
                href={ancestor.horseTelexUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
                HorseTelex
              </a>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{ancestor.name}</p>
            {ancestor.registrationNumber && (
              <p className="text-xs">
                {t("horses:pedigree.regNumber", "Reg")}:{" "}
                {ancestor.registrationNumber}
              </p>
            )}
            {ancestor.ueln && <p className="text-xs">UELN: {ancestor.ueln}</p>}
            {ancestor.breed && (
              <p className="text-xs">
                {t("horses:form.labels.breed", "Breed")}: {ancestor.breed}
              </p>
            )}
            {ancestor.color && (
              <p className="text-xs">
                {t("horses:form.labels.color", "Color")}: {ancestor.color}
              </p>
            )}
            {ancestor.country && (
              <p className="text-xs">
                {t("horses:pedigree.country", "Country")}: {ancestor.country}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function PedigreeCard({ horse }: PedigreeCardProps) {
  const { t, i18n } = useTranslation(["horses", "common"]);
  const queryClient = useQueryClient();
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch pedigree data
  const { data: pedigreeData, isLoading } = useQuery<PedigreeData>({
    queryKey: ["horse-pedigree", horse.id],
    queryFn: async () => {
      const response = await authFetch(`/api/v1/horses/${horse.id}/pedigree`);
      if (!response.ok) {
        if (response.status === 404) {
          return {} as PedigreeData;
        }
        throw new Error("Failed to fetch pedigree");
      }
      return response.json();
    },
  });

  // HorseTelex search mutation (stub)
  const searchMutation = useMutation({
    mutationFn: async (query: string): Promise<HorseTelexSearchResult[]> => {
      // This is a stub - in production, this would call the HorseTelex API
      const response = await authFetch(
        `/api/v1/horsetelex/search?q=${encodeURIComponent(query)}`,
      );
      if (!response.ok) {
        // For now, return empty results since the API is a stub
        return [];
      }
      return response.json();
    },
  });

  // Import from HorseTelex mutation (stub)
  const importMutation = useMutation({
    mutationFn: async (horseTelexId: string) => {
      const response = await authFetch(
        `/api/v1/horses/${horse.id}/pedigree/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            horseTelexId,
            includeFullPedigree: true,
          }),
        },
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to import pedigree");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["horse-pedigree", horse.id] });
      setIsSearchDialogOpen(false);
    },
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery.trim());
    }
  };

  // Calculate pedigree stats
  const hasPedigree = pedigreeData && (pedigreeData.sire || pedigreeData.dam);
  const generationCount = hasPedigree
    ? countPedigreeGenerationsLocal(pedigreeData)
    : 0;
  const ancestorCount = hasPedigree
    ? countPedigreeAncestorsLocal(pedigreeData)
    : 0;

  // Local implementation of pedigree counting (to avoid import issues)
  function countPedigreeGenerationsLocal(pedigree: HorsePedigree): number {
    if (!pedigree.sire && !pedigree.dam) return 0;
    const hasGen1 = !!(pedigree.sire || pedigree.dam);
    const hasGen2 = !!(
      pedigree.sireSire ||
      pedigree.sireDam ||
      pedigree.damSire ||
      pedigree.damDam
    );
    const hasGen3 = !!(
      pedigree.sireSireSire ||
      pedigree.sireSireDam ||
      pedigree.sireDamSire ||
      pedigree.sireDamDam ||
      pedigree.damSireSire ||
      pedigree.damSireDam ||
      pedigree.damDamSire ||
      pedigree.damDamDam
    );
    if (hasGen3) return 3;
    if (hasGen2) return 2;
    if (hasGen1) return 1;
    return 0;
  }

  function countPedigreeAncestorsLocal(pedigree: HorsePedigree): number {
    const ancestors = [
      pedigree.sire,
      pedigree.dam,
      pedigree.sireSire,
      pedigree.sireDam,
      pedigree.damSire,
      pedigree.damDam,
      pedigree.sireSireSire,
      pedigree.sireSireDam,
      pedigree.sireDamSire,
      pedigree.sireDamDam,
      pedigree.damSireSire,
      pedigree.damSireDam,
      pedigree.damDamSire,
      pedigree.damDamDam,
    ];
    return ancestors.filter((a) => a?.name).length;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("horses:pedigree.title", "Pedigree")}</CardTitle>
            {hasPedigree && (
              <Badge variant="secondary" className="ml-2">
                {t("horses:pedigree.generations", "{{count}} generations", {
                  count: generationCount,
                })}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSearchDialogOpen(true)}
            >
              <Search className="h-4 w-4 mr-1" />
              {t(
                "horses:pedigree.importFromHorseTelex",
                "Import from HorseTelex",
              )}
            </Button>
            {hasPedigree && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                {t("common:buttons.edit", "Edit")}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            {t("common:loading", "Loading...")}
          </div>
        ) : !hasPedigree ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <GitBranch className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {t("horses:pedigree.noPedigree", "No pedigree recorded")}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              {t(
                "horses:pedigree.addPedigreeHint",
                "Import from HorseTelex or add pedigree information manually",
              )}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSearchDialogOpen(true)}
            >
              <Search className="h-4 w-4 mr-1" />
              {t("horses:pedigree.searchHorseTelex", "Search HorseTelex")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pedigree Stats */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Info className="h-4 w-4" />
                {t(
                  "horses:pedigree.ancestorsRecorded",
                  "{{count}} ancestors recorded",
                  {
                    count: ancestorCount,
                  },
                )}
              </div>
              {pedigreeData?.importSource && (
                <div className="flex items-center gap-1">
                  <Badge variant="outline">
                    {pedigreeData.importSource === "horsetelex"
                      ? "HorseTelex"
                      : pedigreeData.importSource === "ueln_registry"
                        ? "UELN Registry"
                        : t("horses:pedigree.manual", "Manual")}
                  </Badge>
                </div>
              )}
            </div>

            {/* Pedigree Tree - 3 Generations */}
            <div className="overflow-x-auto">
              <div className="min-w-[600px] grid grid-cols-[1fr_1fr_1fr_1fr] gap-2">
                {/* Generation 3 (Great-grandparents) */}
                <div className="space-y-2">
                  <AncestorBox
                    ancestor={pedigreeData?.sireSireSire}
                    label="SSS"
                    generation={3}
                  />
                  <AncestorBox
                    ancestor={pedigreeData?.sireSireDam}
                    label="SSD"
                    generation={3}
                  />
                  <AncestorBox
                    ancestor={pedigreeData?.sireDamSire}
                    label="SDS"
                    generation={3}
                  />
                  <AncestorBox
                    ancestor={pedigreeData?.sireDamDam}
                    label="SDD"
                    generation={3}
                  />
                  <AncestorBox
                    ancestor={pedigreeData?.damSireSire}
                    label="DSS"
                    generation={3}
                  />
                  <AncestorBox
                    ancestor={pedigreeData?.damSireDam}
                    label="DSD"
                    generation={3}
                  />
                  <AncestorBox
                    ancestor={pedigreeData?.damDamSire}
                    label="DDS"
                    generation={3}
                  />
                  <AncestorBox
                    ancestor={pedigreeData?.damDamDam}
                    label="DDD"
                    generation={3}
                  />
                </div>

                {/* Generation 2 (Grandparents) */}
                <div className="space-y-2 pt-[26px]">
                  <div className="h-[84px] flex items-center">
                    <AncestorBox
                      ancestor={pedigreeData?.sireSire}
                      label={t(
                        "horses:pedigree.sireSire",
                        "Paternal Grandfather",
                      )}
                      generation={2}
                    />
                  </div>
                  <div className="h-[84px] flex items-center">
                    <AncestorBox
                      ancestor={pedigreeData?.sireDam}
                      label={t(
                        "horses:pedigree.sireDam",
                        "Paternal Grandmother",
                      )}
                      generation={2}
                    />
                  </div>
                  <div className="h-[84px] flex items-center">
                    <AncestorBox
                      ancestor={pedigreeData?.damSire}
                      label={t(
                        "horses:pedigree.damSire",
                        "Maternal Grandfather",
                      )}
                      generation={2}
                    />
                  </div>
                  <div className="h-[84px] flex items-center">
                    <AncestorBox
                      ancestor={pedigreeData?.damDam}
                      label={t(
                        "horses:pedigree.damDam",
                        "Maternal Grandmother",
                      )}
                      generation={2}
                    />
                  </div>
                </div>

                {/* Generation 1 (Parents) */}
                <div className="space-y-2 pt-[68px]">
                  <div className="h-[168px] flex items-center">
                    <div className="w-full">
                      <div className="text-xs text-muted-foreground mb-1 font-medium">
                        {t("horses:form.labels.sire", "Sire")}
                      </div>
                      <AncestorBox
                        ancestor={pedigreeData?.sire}
                        label={t("horses:form.labels.sire", "Sire")}
                        generation={1}
                      />
                    </div>
                  </div>
                  <div className="h-[168px] flex items-center">
                    <div className="w-full">
                      <div className="text-xs text-muted-foreground mb-1 font-medium">
                        {t("horses:form.labels.dam", "Dam")}
                      </div>
                      <AncestorBox
                        ancestor={pedigreeData?.dam}
                        label={t("horses:form.labels.dam", "Dam")}
                        generation={1}
                      />
                    </div>
                  </div>
                </div>

                {/* Horse (Subject) */}
                <div className="pt-[152px]">
                  <div className="h-[168px] flex items-center">
                    <div className="w-full border-2 border-primary rounded p-3 bg-primary/5">
                      <div className="font-semibold">{horse.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {horse.breed && <span>{horse.breed}</span>}
                        {horse.dateOfBirth && (
                          <span className="ml-1">
                            ({new Date(horse.dateOfBirth).getFullYear()})
                          </span>
                        )}
                      </div>
                      {horse.ueln && (
                        <div className="text-xs text-muted-foreground mt-1">
                          UELN: {horse.ueln}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* HorseTelex Search Dialog */}
      <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t(
                "horses:pedigree.importFromHorseTelex",
                "Import from HorseTelex",
              )}
            </DialogTitle>
            <DialogDescription>
              {t(
                "horses:pedigree.searchDescription",
                "Search HorseTelex database to import pedigree information",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Integration Notice */}
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">
                  {t(
                    "horses:pedigree.integrationPending",
                    "Integration Pending",
                  )}
                </p>
                <p>
                  {t(
                    "horses:pedigree.integrationPendingDescription",
                    "HorseTelex integration requires API partnership. This feature will be available soon.",
                  )}
                </p>
              </div>
            </div>

            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="horsetelex-search">
                {t(
                  "horses:pedigree.searchByName",
                  "Search by horse name or UELN",
                )}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="horsetelex-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t(
                    "horses:pedigree.searchPlaceholder",
                    "Enter horse name or UELN...",
                  )}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || searchMutation.isPending}
                >
                  {searchMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Search Results */}
            {searchMutation.data && searchMutation.data.length > 0 && (
              <div className="space-y-2">
                <Label>
                  {t("horses:pedigree.searchResults", "Search Results")}
                </Label>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {searchMutation.data.map((result) => (
                    <div
                      key={result.horseTelexId}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50"
                    >
                      <div>
                        <p className="font-medium">{result.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {result.breed}{" "}
                          {result.birthYear && `(${result.birthYear})`}
                        </p>
                        {result.sire && result.dam && (
                          <p className="text-xs text-muted-foreground">
                            {result.sire} x {result.dam}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          importMutation.mutate(result.horseTelexId)
                        }
                        disabled={importMutation.isPending}
                      >
                        {importMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          t("horses:pedigree.import", "Import")
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchMutation.data && searchMutation.data.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                {t("horses:pedigree.noResults", "No results found")}
              </div>
            )}

            {/* Manual Entry Link */}
            <div className="text-center pt-2 border-t">
              <Button
                variant="link"
                onClick={() => {
                  setIsSearchDialogOpen(false);
                  setIsEditDialogOpen(true);
                }}
              >
                {t("horses:pedigree.enterManually", "Enter pedigree manually")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Edit Dialog - Placeholder */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("horses:pedigree.editPedigree", "Edit Pedigree")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "horses:pedigree.editPedigreeDescription",
                "Manually enter or update pedigree information",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 text-center text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2" />
            <p>
              {t(
                "horses:pedigree.manualEditComingSoon",
                "Manual pedigree editing will be available in a future update",
              )}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
