import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PricingSection = () => {
  const { t } = useTranslation("landing");

  const plans = [
    {
      key: "free",
      highlighted: false,
      link: "/register",
    },
    {
      key: "pro",
      highlighted: true,
      link: "/register?plan=pro",
    },
    {
      key: "enterprise",
      highlighted: false,
      link: "/contact",
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-muted/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">{t("pricing.title")}</h2>
          <p className="text-muted-foreground">{t("pricing.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map(({ key, highlighted, link }) => {
            const price = t(`pricing.${key}.price`);
            const isContactPrice =
              price.toLowerCase().includes("kontakta") ||
              price.toLowerCase().includes("contact");

            return (
              <Card
                key={key}
                className={
                  highlighted ? "border-primary shadow-lg relative" : ""
                }
              >
                {highlighted && t(`pricing.${key}.badge`) && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    {t(`pricing.${key}.badge`)}
                  </Badge>
                )}
                <CardHeader className="pt-8">
                  <CardTitle>{t(`pricing.${key}.name`)}</CardTitle>
                  <CardDescription>
                    {t(`pricing.${key}.description`)}
                  </CardDescription>
                  <div className="mt-4">
                    {isContactPrice ? (
                      <span className="text-2xl font-bold">{price}</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold">{price}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          SEK{t("pricing.perMonth")}
                        </span>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {(
                      t(`pricing.${key}.features`, {
                        returnObjects: true,
                      }) as string[]
                    ).map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={highlighted ? "default" : "outline"}
                    asChild
                  >
                    <Link to={link}>{t(`pricing.${key}.cta`)}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
