import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TestimonialsSection = () => {
  const { t } = useTranslation("landing");

  const testimonials = ["testimonial1", "testimonial2", "testimonial3"];

  return (
    <section id="testimonials" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">{t("testimonials.title")}</h2>
          <p className="text-muted-foreground">{t("testimonials.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((key) => (
            <Card key={key} className="h-full">
              <CardHeader>
                <div className="flex gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-primary text-primary"
                    />
                  ))}
                </div>
                <CardTitle>{t(`testimonials.${key}.title`)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  "{t(`testimonials.${key}.content`)}"
                </p>
                <div>
                  <p className="font-semibold">
                    {t(`testimonials.${key}.author`)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t(`testimonials.${key}.role`)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
