import { useTranslation } from "react-i18next";
import {
  Calendar,
  Heart,
  Utensils,
  Activity,
  Bell,
  Building2,
  PieChart,
  Bot,
  Check,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ModulesSection = () => {
  const { t } = useTranslation("landing");

  const modules = [
    {
      icon: Calendar,
      key: "shifts",
    },
    {
      icon: Heart,
      key: "horses",
    },
    {
      icon: Utensils,
      key: "feeding",
    },
    {
      icon: Activity,
      key: "activities",
    },
    {
      icon: Bell,
      key: "notifications",
    },
    {
      icon: Building2,
      key: "organizations",
    },
    {
      icon: PieChart,
      key: "reporting",
    },
    {
      icon: Bot,
      key: "assistant",
    },
  ];

  return (
    <section id="modules" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">{t("modules.title")}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("modules.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map(({ icon: Icon, key }) => (
            <Card
              key={key}
              className="h-full hover:shadow-lg transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="p-2 w-fit rounded-lg bg-primary/10 mb-3">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">
                  {t(`modules.${key}.title`)}
                </CardTitle>
                <CardDescription className="text-sm">
                  {t(`modules.${key}.description`)}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-1.5">
                  {(
                    t(`modules.${key}.features`, {
                      returnObjects: true,
                    }) as string[]
                  ).map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ModulesSection;
