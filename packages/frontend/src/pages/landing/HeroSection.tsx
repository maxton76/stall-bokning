import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  const { t } = useTranslation("landing");

  return (
    <section className="flex min-h-[calc(100dvh-4rem)] flex-1 flex-col justify-between gap-12 overflow-x-hidden pt-8 sm:gap-16 sm:pt-16 lg:gap-24 lg:pt-24">
      {/* Hero Content */}
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 text-center sm:px-6 lg:px-8">
        <div className="bg-muted flex items-center gap-2.5 rounded-full border px-3 py-2">
          <Badge>{t("hero.badge")}</Badge>
          <span className="text-muted-foreground text-sm">
            {t("hero.badgeDescription")}
          </span>
        </div>

        <h1 className="text-3xl leading-[1.29167] font-bold text-balance sm:text-4xl lg:text-5xl">
          {t("hero.title")}
          <br />
          <span className="relative text-primary">
            {t("hero.titleHighlight")}
            <svg
              width="280"
              height="12"
              viewBox="0 0 280 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute inset-x-0 bottom-0 w-full translate-y-1/2 max-sm:hidden"
              preserveAspectRatio="none"
            >
              <path
                d="M1.11716 10.428C49.7835 4.97282 95.9074 2.70494 144.894 1.98894C180.706 1.45983 220.684 0.313587 256.212 3.31596C263.925 3.60546 271.144 4.59884 278.535 5.74551"
                stroke="url(#paint0_linear_hero)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient
                  id="paint0_linear_hero"
                  x1="18.8541"
                  y1="3.72033"
                  x2="42.6487"
                  y2="66.6308"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="hsl(var(--primary))" />
                  <stop offset="1" stopColor="hsl(var(--primary) / 0.5)" />
                </linearGradient>
              </defs>
            </svg>
          </span>
        </h1>

        <p className="text-muted-foreground max-w-2xl text-lg">
          {t("hero.description")}
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link to="/register">
              {t("hero.cta")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#features">
              <Play className="mr-2 h-4 w-4" />
              {t("hero.ctaSecondary")}
            </a>
          </Button>
        </div>
      </div>

      {/* Image */}
      <img
        src="https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=1200&h=600&fit=crop"
        alt="Modern stable management"
        className="min-h-67 w-full object-cover"
      />
    </section>
  );
};

export default HeroSection;
