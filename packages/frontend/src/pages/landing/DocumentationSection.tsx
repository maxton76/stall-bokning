import { useTranslation } from "react-i18next";
import { BookOpen, Scale, Calendar, ArrowRight } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DocumentationSection = () => {
  const { t } = useTranslation("landing");

  const guides = [
    {
      icon: BookOpen,
      key: "gettingStarted",
      href: "/docs/getting-started",
    },
    {
      icon: Scale,
      key: "fairnessAlgorithm",
      href: "/docs/fairness",
    },
    {
      icon: Calendar,
      key: "scheduling",
      href: "/docs/scheduling",
    },
  ];

  return (
    <section id="documentation" className="py-24 bg-muted/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">
            {t("documentation.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("documentation.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {guides.map(({ icon: Icon, key, href }) => (
            <Card key={key} className="group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="p-3 w-fit rounded-lg bg-primary/10 mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{t(`documentation.${key}.title`)}</CardTitle>
                <CardDescription>
                  {t(`documentation.${key}.description`)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="link" className="p-0 h-auto" asChild>
                  <a href={href}>
                    {t(`documentation.${key}.link`)}
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DocumentationSection;
