import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ChevronRight, Search, Rabbit } from "lucide-react";
// Note: Horse icon doesn't exist in lucide-react, using Rabbit as placeholder
const Horse = Rabbit;
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import {
  getPortalHorses,
  type PortalHorsesResponse,
} from "@/services/portalService";

export default function PortalHorsesPage() {
  const { t } = useTranslation(["portal", "common"]);
  const [searchQuery, setSearchQuery] = useState("");

  const horsesQuery = useApiQuery<PortalHorsesResponse>(
    queryKeys.portal.horses(),
    getPortalHorses,
    { staleTime: 5 * 60 * 1000 },
  );
  const horsesData = horsesQuery.data;
  const horsesLoading = horsesQuery.isLoading;

  // Filter horses by search
  const filteredHorses = useMemo(() => {
    if (!horsesData?.horses) return [];
    if (!searchQuery) return horsesData.horses;
    const query = searchQuery.toLowerCase();
    return horsesData.horses.filter(
      (horse) =>
        horse.name?.toLowerCase().includes(query) ||
        horse.breed?.toLowerCase().includes(query) ||
        horse.registrationNumber?.toLowerCase().includes(query),
    );
  }, [horsesData?.horses, searchQuery]);

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("portal:horses.title")}</h1>
        <p className="text-muted-foreground">
          {t("portal:horses.pageDescription")}
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("common:search.placeholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Horses Grid */}
      {horsesLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredHorses.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center gap-4">
            <Horse className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery
                ? t("common:messages.noResults")
                : t("portal:horses.noHorses")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredHorses.map((horse) => (
            <Link key={horse.id} to={`/portal/horses/${horse.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={horse.photoUrl} alt={horse.name} />
                      <AvatarFallback className="text-lg">
                        {horse.name?.charAt(0) || "H"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{horse.name}</h3>
                        {horse.ownershipType !== "owner" && (
                          <Badge variant="secondary" className="text-xs">
                            {t(
                              `portal:horses.ownership.${horse.ownershipType}`,
                            )}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {horse.breed}
                        {horse.color && ` • ${horse.color}`}
                      </p>
                      {horse.registrationNumber && (
                        <p className="text-sm text-muted-foreground">
                          {horse.registrationNumber}
                        </p>
                      )}
                      {horse.stableName && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {horse.stableName}
                          {horse.stallNumber && ` (${horse.stallNumber})`}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>

                  {/* Stats Row */}
                  <div className="mt-4 flex items-center gap-4 text-sm">
                    {horse.upcomingActivities > 0 && (
                      <span className="text-muted-foreground">
                        {t("portal:horses.upcomingActivities", {
                          count: horse.upcomingActivities,
                        })}
                      </span>
                    )}
                    {horse.age && (
                      <span className="text-muted-foreground">
                        {t("portal:horses.age", { age: horse.age })}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
