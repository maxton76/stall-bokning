import { useTranslation } from "react-i18next";
import {
  Scale,
  CalendarClock,
  Bell,
  Smartphone,
  BarChart3,
  Shield,
  Check,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const FeaturesSection = () => {
  const { t } = useTranslation("landing");

  const features = [
    {
      icon: Scale,
      key: "fairness",
    },
    {
      icon: CalendarClock,
      key: "automation",
    },
    {
      icon: Bell,
      key: "notifications",
    },
    {
      icon: Smartphone,
      key: "mobile",
    },
    {
      icon: BarChart3,
      key: "analytics",
    },
    {
      icon: Shield,
      key: "security",
    },
  ];

  return (
    <section id="features" className="py-24 bg-muted/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">{t("features.title")}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("features.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map(({ icon: Icon, key }) => (
            <Card key={key} className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <CardTitle>{t(`features.${key}.title`)}</CardTitle>
                <CardDescription>
                  {t(`features.${key}.description`)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(
                    t(`features.${key}.features`, {
                      returnObjects: true,
                    }) as string[]
                  ).map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">
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

export default FeaturesSection;
